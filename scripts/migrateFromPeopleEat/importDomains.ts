import type { Pool as MysqlPool, RowDataPacket } from 'mysql2/promise';
import type { Pool as PgPool } from 'pg';

import { isSessionEventKey } from '../../src/server/domain/sessionEvent';
import { fileUploadPublicUrl } from '../../src/shared/contentSection';
import { idCreate } from '../../src/shared/idCreate';
import { phoneNumberNormalize } from '../../src/shared/phoneNumber';
import type { Archiver } from './archive';
import { chunkArray, mapPool } from './batch';
import type { MigrateConfig } from './config';
import type { FailureLog } from './failures';
import type { FileImporter } from './files';
import { legalImport } from './legalImport';
import { progressCreate } from './progress';
import { timeControlledTasksImport } from './timeControlledTasksImport';
import {
    asDate,
    asDateString,
    contentSectionsFromLegacy,
    importPathNameResolve,
    invoiceAddressRename,
    ipHashFromPlaintext,
    joinName,
    legacyJsonArray,
    localeFromLanguageCode,
    peopleEatImageRouteFromUrl,
    sessionEventPayloadFromLegacy,
    syntheticUserAgent,
} from './transforms';
import { webPagesImport } from './webPagesImport';

type LegacyContentSectionImage = {
    imageId?: string | null;
    imageUrl?: string | null;
};

type MediaFetchJob = {
    key: string;
    fetch: () => Promise<string | null>;
};

/** Deduped HTTP media fetches (route + id or absolute URL). */
function mediaFetchJobsCreate() {
    const jobs = new Map<string, MediaFetchJob>();
    return {
        addRoute(route: string, imageId: string, fetch: () => Promise<string | null>) {
            if (!imageId) return;
            const key = `route:${route}:${imageId}`;
            if (!jobs.has(key)) jobs.set(key, { key, fetch });
        },
        addUrl(url: string, fetch: () => Promise<string | null>) {
            if (!url) return;
            const key = `url:${url}`;
            if (!jobs.has(key)) jobs.set(key, { key, fetch });
        },
        addSectionImages(route: string, sections: LegacyContentSectionImage[], files: FileImporter) {
            for (const section of sections) {
                if (section.imageId) {
                    this.addRoute(route, section.imageId, () => files.ensureFromRoute(route, section.imageId!));
                } else if (section.imageUrl) {
                    const fromUrl = peopleEatImageRouteFromUrl(section.imageUrl);
                    if (fromUrl) {
                        this.addRoute(fromUrl.route, fromUrl.imageId, () => files.ensureFromRoute(fromUrl.route, fromUrl.imageId));
                    } else {
                        const url = String(section.imageUrl);
                        this.addUrl(url, () => files.ensureFromUrl(url));
                    }
                }
            }
        },
        values() {
            return [...jobs.values()];
        },
    };
}

async function runMediaFetchJobs(jobs: MediaFetchJob[], concurrency: number, label: string): Promise<void> {
    if (jobs.length === 0) return;
    const progress = progressCreate(label, jobs.length);
    await mapPool(jobs, concurrency, async (job) => {
        await job.fetch();
        progress.tick();
    });
    progress.done();
}

function jsonParam(value: unknown): string | null {
    if (value == null) return null;
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
}

function asNullableNumber(value: unknown): number | null {
    if (value == null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

const bookingRequestPublicationStatuses = new Set([
    'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW',
    'PUBLICATION_AUTO_APPROVED',
    'PUBLICATION_APPROVED_BY_ADMIN',
]);

/** Predecessor rows often omit publicationStatus; new column is NOT NULL. */
function bookingRequestPublicationStatusFromLegacy(value: unknown): string {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (bookingRequestPublicationStatuses.has(raw)) return raw;
    return 'PUBLICATION_AUTO_APPROVED';
}

/** Predecessor used ADULT/CHILDREN (+ count); new model is ADULT|DISCOUNTED per person. */
function bookingRequestParticipantTypeFromLegacy(value: unknown): 'ADULT' | 'DISCOUNTED' {
    const raw = String(value ?? '')
        .trim()
        .toUpperCase();
    if (raw === 'ADULT') return 'ADULT';
    if (raw === 'DISCOUNTED' || raw === 'CHILDREN' || raw === 'CHILD' || raw === 'KIDS' || raw === 'TEEN') {
        return 'DISCOUNTED';
    }
    return 'ADULT';
}

async function mysqlAll<T extends RowDataPacket>(mysql: MysqlPool, sql: string): Promise<T[]> {
    try {
        const [rows] = await mysql.query<T[]>(sql);
        return rows;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/doesn't exist|ER_NO_SUCH_TABLE/i.test(message)) {
            console.warn(`Skipping missing table query: ${sql.slice(0, 80)}…`);
            return [];
        }
        throw error;
    }
}

export async function importAllDomains(args: {
    config: MigrateConfig;
    mysql: MysqlPool;
    pg: PgPool;
    files: FileImporter;
    archive: Archiver;
    failures: FailureLog;
}): Promise<void> {
    const { config, mysql, pg, files, archive, failures } = args;
    const dry = config.dryRun;

    async function recordFailure(source: string, sourceId: string, message: string, payload?: unknown): Promise<void> {
        failures.record(source, sourceId, message);
        console.warn(`Skipping ${source} ${sourceId}: ${message}`);
        if (payload !== undefined) {
            await archive.write(
                `${source}.failed`,
                sourceId,
                typeof payload === 'object' ? { ...payload, error: message } : { error: message, payload },
            );
        } else {
            await archive.write(`${source}.failed`, sourceId, { error: message });
        }
    }

    async function exec(sql: string, params: unknown[] = []): Promise<void> {
        if (dry) return;
        await pg.query(sql, params);
    }

    // --- Legal (published before Users so acceptance gate has a document) ---
    await legalImport({ mysql, pg, dryRun: dry });

    // --- Users (+ phone / email pending) ------------------------------------
    const users = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM Users');
    const phoneUpdates = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM PhoneNumberUpdates');
    const emailUpdates = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM EmailAddressUpdates');
    const phoneByUser = new Map(phoneUpdates.map((row) => [String(row.userId), row]));
    const emailByUser = new Map(emailUpdates.map((row) => [String(row.userId), row]));
    const claimedPhones = new Map<string, string>();
    const claimedEmails = new Map<string, string>();
    const knownUserIds = new Set<string>();
    const usersProgress = progressCreate('Importing Users…', users.length);

    for (const user of users) {
        const userId = String(user.userId);
        let phoneNumber: string | null = user.phoneNumber ? String(user.phoneNumber) : null;
        const pendingPhone = phoneByUser.get(userId);
        if (pendingPhone?.phoneNumber) {
            phoneNumber = String(pendingPhone.phoneNumber);
        }
        if (phoneNumber) {
            const normalized = phoneNumberNormalize(phoneNumber);
            if (!normalized) {
                await archive.write('PhoneNumberInvalid', userId, { phoneNumber });
                phoneNumber = null;
            } else {
                phoneNumber = normalized;
            }
        }

        if (phoneNumber) {
            const owner = claimedPhones.get(phoneNumber);
            if (owner && owner !== userId) {
                await archive.write('PhoneNumberConflict', userId, {
                    phoneNumber,
                    keptUserId: owner,
                    droppedFromUserId: userId,
                });
                phoneNumber = null;
            } else {
                claimedPhones.set(phoneNumber, userId);
            }
        }

        // Pending email is an unconfirmed change, not a prior address. Apply it
        // when the user has no confirmed email (same idea as pending phone);
        // otherwise keep the confirmed email and archive the pending row.
        let emailAddress: string | null = user.emailAddress ? String(user.emailAddress) : null;
        const pendingEmail = emailByUser.get(userId);
        if (pendingEmail?.emailAddress) {
            const pending = String(pendingEmail.emailAddress);
            if (!emailAddress) {
                emailAddress = pending;
            } else if (pending !== emailAddress) {
                await archive.write('EmailAddressUpdates.pending', userId, {
                    pendingEmail: pending,
                    keptEmail: emailAddress,
                });
            }
        }
        if (emailAddress) {
            const owner = claimedEmails.get(emailAddress);
            if (owner && owner !== userId) {
                await archive.write('EmailAddressConflict', userId, {
                    emailAddress,
                    keptUserId: owner,
                    droppedFromUserId: userId,
                });
                emailAddress = null;
            } else {
                claimedEmails.set(emailAddress, userId);
            }
        }

        let adminNote = String(user.adminNote ?? '');
        if (pendingPhone && user.phoneNumber && String(pendingPhone.phoneNumber) !== String(user.phoneNumber)) {
            adminNote = [adminNote, `[import] replaced phone ${user.phoneNumber} with pending ${pendingPhone.phoneNumber}`]
                .filter(Boolean)
                .join('\n');
        }
        if (pendingEmail?.emailAddress && !user.emailAddress) {
            adminNote = [adminNote, `[import] applied pending email ${String(pendingEmail.emailAddress)}`].filter(Boolean).join('\n');
        }

        await exec(
            `INSERT INTO "Users" (
                "userId", "emailAddress", "previousEmailAddresses", "firstName", "lastName", "status",
                "phoneNumber", "legacyPasswordHash", "adminNote", "birthDate", "preferredCommunication",
                "locale", "timeZone", "lastAcceptedPrivacyPolicy", "lastAcceptedTerms",
                "profilePictureFileUploadId", "createdAt"
             ) VALUES (
                $1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NULL,$16
             ) ON CONFLICT ("userId") DO NOTHING`,
            [
                userId,
                emailAddress,
                JSON.stringify([]),
                String(user.firstName ?? ''),
                String(user.lastName ?? ''),
                String(user.status ?? 'ACTIVE'),
                phoneNumber,
                user.password ?? null,
                adminNote,
                asDateString(user.birthDate as Date | string | null),
                user.preferredCommunication ?? null,
                localeFromLanguageCode(user.languageCode as string | null),
                String(user.timeZone ?? 'Europe/Berlin'),
                asDate(user.lastAcceptedPrivacyPolicy as Date | string | null),
                asDate(user.lastAcceptedTerms as Date | string | null),
                asDate(user.createdAt as Date | string | null) ?? new Date(),
            ],
        );
        knownUserIds.add(userId);
        usersProgress.tick();
    }
    usersProgress.done();

    // Profile pictures (HTTP-bound — parallelize fetches + updates)
    const profilePicUsers = users.filter((user) => user.profilePictureUrl);
    const profilePicProgress = progressCreate('Importing User profile pictures…', profilePicUsers.length);
    await mapPool(profilePicUsers, config.httpConcurrency, async (user) => {
        const url = String(user.profilePictureUrl);
        const fileUploadId = await files.ensureFromUrl(url, String(user.userId));
        if (fileUploadId) {
            await exec(`UPDATE "Users" SET "profilePictureFileUploadId" = $1 WHERE "userId" = $2`, [fileUploadId, String(user.userId)]);
        }
        profilePicProgress.tick();
    });
    profilePicProgress.done();

    // --- Admins / Cooks -----------------------------------------------------
    const admins = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM Admins');
    const adminsProgress = progressCreate('Importing Admins…', admins.length);
    for (const admin of admins) {
        await exec(`INSERT INTO "Admins" ("adminId", "createdAt") VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
            String(admin.adminId),
            asDate(admin.createdAt as Date | string | null) ?? new Date(),
        ]);
        adminsProgress.tick();
    }
    adminsProgress.done();

    const cooksRows = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM Cooks');
    const cooksProgress = progressCreate('Importing Cooks…', cooksRows.length);
    for (const cook of cooksRows) {
        const cookId = String(cook.cookId);
        const payoutMethods = (cook.payoutMethods ?? []) as Array<{
            type: string;
            accountId: string;
            active: boolean;
            activeStatusWasReset?: boolean;
        }>;
        const stripe = payoutMethods.find((method) => method.type === 'STRIPE_CONNECTED_ACCOUNT');

        // Stripe Connect is mapped onto Cooks.stripeAccount* from payoutMethods.
        // stageName / lastModifiedAt import onto Cooks columns. Predecessor `rank`
        // is dropped (not archived). Do not archive payoutMethods — it only
        // restates the Stripe fields already imported.
        const createdAt = asDate(cook.createdAt as Date | string | null) ?? new Date();
        const lastModifiedAt = asDate(cook.lastModifiedAt as Date | string | null) ?? createdAt;
        const stageNameRaw = cook.stageName != null ? String(cook.stageName).trim() : '';

        await exec(
            `INSERT INTO "Cooks" (
                "cookId", "isVisible", "isApprovedByAdmin", "stageName", "exactTravelOriginAddress",
                "biography", "biographySummary", "logoFileUploadId", "cuisineStyle", "cookingPhilosophy",
                "travelExpensesAmount", "maximumTravelDistance", "minimumPriceAmount", "maximumPriceAmount",
                "minimumParticipants", "maximumParticipants", "callSchedulingEnabled", "callDurationMinutes",
                "stripeAccountId", "stripeAccountActive", "stripeAccountActiveWasReset",
                "legacyCityName", "legacyLatitude", "legacyLongitude", "createdAt", "lastModifiedAt"
             ) VALUES (
                $1,$2,$3,$4,$5::jsonb,$6,$7,NULL,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25
             ) ON CONFLICT ("cookId") DO NOTHING`,
            [
                cookId,
                Boolean(cook.isVisible),
                Boolean(cook.isApprovedByAdmin),
                stageNameRaw.length > 0 ? stageNameRaw : null,
                jsonParam(cook.exactTravelOriginAddress),
                String(cook.biography ?? ''),
                String(cook.biographySummary ?? ''),
                cook.cuisineStyle ?? null,
                cook.cookingPhilosophy ?? null,
                Number(cook.travelExpensesAmount ?? 25),
                cook.maximumTravelDistance ?? null,
                cook.minimumPriceAmount ?? null,
                cook.maximumPriceAmount ?? null,
                cook.minimumParticipants ?? null,
                cook.maximumParticipants ?? null,
                Boolean(cook.callSchedulingEnabled),
                Number(cook.callDurationMinutes ?? 30),
                stripe?.accountId ?? null,
                Boolean(stripe?.active),
                Boolean(stripe?.activeStatusWasReset),
                cook.cityName != null ? String(cook.cityName) : null,
                asNullableNumber(cook.latitude),
                asNullableNumber(cook.longitude),
                createdAt,
                lastModifiedAt,
            ],
        );
        cooksProgress.tick();
    }
    cooksProgress.done();

    // --- Sessions + CookieSettings ------------------------------------------
    // Multi-row INSERT batches + bounded concurrency. Do NOT archive Sessions.extra
    // per row. Orphan userIds are nulled so the Users FK cannot abort a batch.
    const sessions = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM Sessions');
    const importedSessionIds = new Set<string>();
    let orphanUserIdSessions = 0;
    type SessionRow = { sessionId: string; rawUserId: string | null; params: unknown[] };
    const sessionRows: SessionRow[] = [];
    for (const session of sessions) {
        const sessionId = String(session.sessionId);
        const signedOut = Boolean(session.signedOut);
        const lastExtendedAt = asDate(session.lastExtendedAt as Date | string | null);
        const createdAt = asDate(session.createdAt as Date | string | null) ?? new Date();
        const rawUserId = session.userId ? String(session.userId) : null;
        const userId = rawUserId && knownUserIds.has(rawUserId) ? rawUserId : null;
        if (rawUserId && !userId) orphanUserIdSessions += 1;
        sessionRows.push({
            sessionId,
            rawUserId,
            params: [
                sessionId,
                userId,
                session.previousSessionId ? String(session.previousSessionId) : null,
                lastExtendedAt ?? createdAt,
                signedOut ? (lastExtendedAt ?? createdAt) : null,
                Boolean(session.connectionActive),
                syntheticUserAgent({
                    clientType: session.clientType as string,
                    platform: session.platform as string,
                    browser: session.browser as string,
                }),
                ipHashFromPlaintext(config.visitorIpHashSalt, session.ipAddress as string | null),
                session.originReferer ?? null,
                session.originUrlPath ?? null,
                jsonParam(session.geoInformation),
                String(session.clientType) === 'BOT',
                createdAt,
            ],
        });
    }

    const sessionsProgress = progressCreate('Importing Sessions…', sessionRows.length);
    const sessionBatches = chunkArray(sessionRows, config.dbBatchSize);

    async function insertSessionBatch(batch: SessionRow[]): Promise<void> {
        const valuesSql = batch
            .map((_, rowIndex) => {
                const base = rowIndex * 13;
                return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11}::jsonb,$${base + 12},$${base + 13})`;
            })
            .join(',');
        const params = batch.flatMap((row) => row.params);
        try {
            await exec(
                `INSERT INTO "Sessions" (
                    "sessionId", "userId", "previousSessionId", "lastInteractionAt", "wasTerminatedAt",
                    "connectionActive", "userAgent", "ipHash", "referrer", "landingPath", "geoInformation",
                    "isBot", "createdAt"
                 ) VALUES ${valuesSql} ON CONFLICT ("sessionId") DO NOTHING`,
                params,
            );
            for (const row of batch) importedSessionIds.add(row.sessionId);
        } catch (error) {
            // One bad row should not drop the whole batch — fall back to singles.
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`Session batch failed (${batch.length} rows), retrying one-by-one: ${message}`);
            for (const row of batch) {
                try {
                    await exec(
                        `INSERT INTO "Sessions" (
                            "sessionId", "userId", "previousSessionId", "lastInteractionAt", "wasTerminatedAt",
                            "connectionActive", "userAgent", "ipHash", "referrer", "landingPath", "geoInformation",
                            "isBot", "createdAt"
                         ) VALUES (
                            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13
                         ) ON CONFLICT ("sessionId") DO NOTHING`,
                        row.params,
                    );
                    importedSessionIds.add(row.sessionId);
                } catch (rowError) {
                    const rowMessage = rowError instanceof Error ? rowError.message : String(rowError);
                    await recordFailure('Sessions', row.sessionId, rowMessage, { userId: row.rawUserId });
                }
            }
        }
        sessionsProgress.tick(batch.length);
    }

    await mapPool(sessionBatches, config.dbConcurrency, async (batch) => {
        await insertSessionBatch(batch);
    });
    sessionsProgress.done();
    if (orphanUserIdSessions > 0) {
        console.log(`Sessions with orphan userId nulled: ${orphanUserIdSessions.toLocaleString('en-US')}`);
    }
    console.log(
        `Sessions imported (attempted): ${importedSessionIds.size.toLocaleString('en-US')} / ${sessions.length.toLocaleString('en-US')}`,
    );

    const cookies = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM CookieSettings');
    const cookieRows = cookies
        .map((cookie) => ({
            sessionId: String(cookie.sessionId),
            params: [
                String(cookie.sessionId),
                Boolean(cookie.googleAnalytics),
                Boolean(cookie.microsoftClarity ?? cookie.clarity),
            ] as unknown[],
        }))
        .filter((row) => importedSessionIds.has(row.sessionId));
    const cookiesProgress = progressCreate('Importing CookieSettings…', cookieRows.length);
    const cookieBatches = chunkArray(cookieRows, config.dbBatchSize);
    await mapPool(cookieBatches, config.dbConcurrency, async (batch) => {
        const valuesSql = batch
            .map((_, rowIndex) => {
                const base = rowIndex * 3;
                return `($${base + 1},$${base + 2},$${base + 3})`;
            })
            .join(',');
        await exec(
            `INSERT INTO "CookieSettings" ("sessionId", "googleAnalytics", "clarity")
             VALUES ${valuesSql} ON CONFLICT ("sessionId") DO NOTHING`,
            batch.flatMap((row) => row.params),
        );
        cookiesProgress.tick(batch.length);
    });
    cookiesProgress.done();

    // --- Promo codes --------------------------------------------------------
    const promos = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM PromoCodes');
    const promosProgress = progressCreate('Importing PromoCodes…', promos.length);
    for (const promo of promos) {
        await exec(
            `INSERT INTO "PromoCodes" (
                "promoCodeId", "redeemCode", "amountCents", "minimumTotalAmountCustomerCents",
                "bookingRequestId", "createdAt", "expiresAt"
             ) VALUES ($1,$2,$3,$4,NULL,$5,$6) ON CONFLICT DO NOTHING`,
            [
                String(promo.promoCodeId),
                String(promo.redeemCode),
                Number(promo.amount ?? 0),
                promo.minimumTotalAmountCustomer ?? null,
                asDate(promo.createdAt as Date | string | null) ?? new Date(),
                asDate(promo.expiresAt as Date | string | null) ?? new Date(),
            ],
        );
        promosProgress.tick();
    }
    promosProgress.done();

    // --- Meals / Menus ------------------------------------------------------
    const meals = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM Meals');
    const mealsProgress = progressCreate('Importing Meals…', meals.length);
    await mapPool(meals, config.httpConcurrency, async (meal) => {
        const mealId = String(meal.mealId);
        const imageUrl = meal.imageUrl ? String(meal.imageUrl) : null;
        const imageFileUploadId = imageUrl ? await files.ensureFromUrl(imageUrl, String(meal.cookId)) : null;
        const createdAt = asDate(meal.createdAt as Date | string | null) ?? new Date();
        const deletedAt = asDate(meal.deletedAt as Date | string | null);
        // Predecessor meals have no draft flag: non-deleted rows were live.
        const publishedAt = deletedAt ? null : createdAt;
        await exec(
            `INSERT INTO "Meals" (
                "mealId", "cookId", "title", "description", "imageFileUploadId",
                "publishedAt", "createdAt", "updatedAt", "deletedAt"
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
            [
                mealId,
                String(meal.cookId),
                String(meal.title ?? ''),
                String(meal.description ?? ''),
                imageFileUploadId,
                publishedAt,
                createdAt,
                createdAt,
                deletedAt,
            ],
        );
        mealsProgress.tick();
    });
    mealsProgress.done();

    // Menus / courses / options — log before each MySQL SELECT so a slow remote
    // read cannot look like a hang after Meals.
    console.log('Loading Menus from MySQL…');
    const menus = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM Menus');
    console.log(`Loaded ${menus.length.toLocaleString('en-US')} Menus`);
    // Skip Menus.extra per-row archive (preparationTime / greetingFromKitchen) —
    // same stall pattern as Sessions.extra; keep those fields in the MySQL dump.
    const menuRows = menus.map((menu) => {
        const createdAt = asDate(menu.createdAt as Date | string | null) ?? new Date();
        return [
            String(menu.menuId),
            String(menu.cookId),
            String(menu.title ?? ''),
            String(menu.description ?? ''),
            menu.isVisible ? createdAt : null,
            createdAt,
            createdAt,
        ];
    });
    const menusProgress = progressCreate('Importing Menus…', menuRows.length);
    await mapPool(chunkArray(menuRows, config.dbBatchSize), config.dbConcurrency, async (batch) => {
        const valuesSql = batch
            .map((_, rowIndex) => {
                const base = rowIndex * 7;
                return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},NULL,NULL,$${base + 5},$${base + 6},$${base + 7},NULL)`;
            })
            .join(',');
        await exec(
            `INSERT INTO "Menus" (
                "menuId", "cookId", "title", "description", "bookingRequestOfferId", "copyOfMenuId",
                "publishedAt", "createdAt", "updatedAt", "deletedAt"
             ) VALUES ${valuesSql} ON CONFLICT DO NOTHING`,
            batch.flatMap((row) => row),
        );
        menusProgress.tick(batch.length);
    });
    menusProgress.done();

    console.log('Loading MenuCourses from MySQL…');
    const courses = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM MenuCourses');
    console.log(`Loaded ${courses.length.toLocaleString('en-US')} MenuCourses`);
    const courseRows = courses.map((course) => [
        String(course.courseId),
        String(course.menuId),
        String(course.cookId),
        Number(course.index ?? 0),
        String(course.title ?? ''),
        course.mealSelectionLimit ?? null,
    ]);
    const coursesProgress = progressCreate('Importing MenuCourses…', courseRows.length);
    await mapPool(chunkArray(courseRows, config.dbBatchSize), config.dbConcurrency, async (batch) => {
        const valuesSql = batch
            .map((_, rowIndex) => {
                const base = rowIndex * 6;
                return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6})`;
            })
            .join(',');
        await exec(
            `INSERT INTO "MenuCourses" ("courseId", "menuId", "cookId", "index", "title", "mealSelectionLimit")
             VALUES ${valuesSql} ON CONFLICT DO NOTHING`,
            batch.flatMap((row) => row),
        );
        coursesProgress.tick(batch.length);
    });
    coursesProgress.done();

    console.log('Loading MenuCourseMealOptions from MySQL…');
    const mealOptions = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM MenuCourseMealOptions');
    console.log(`Loaded ${mealOptions.length.toLocaleString('en-US')} MenuCourseMealOptions`);
    const optionRows = mealOptions.map((option) => [
        String(option.mealOptionId),
        String(option.courseId),
        String(option.mealId),
        String(option.cookId),
        Number(option.index ?? 0),
    ]);
    const optionsProgress = progressCreate('Importing MenuCourseMealOptions…', optionRows.length);
    await mapPool(chunkArray(optionRows, config.dbBatchSize), config.dbConcurrency, async (batch) => {
        const valuesSql = batch
            .map((_, rowIndex) => {
                const base = rowIndex * 5;
                return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5})`;
            })
            .join(',');
        await exec(
            `INSERT INTO "MenuCourseMealOptions" ("mealOptionId", "courseId", "mealId", "cookId", "index")
             VALUES ${valuesSql} ON CONFLICT DO NOTHING`,
            batch.flatMap((row) => row),
        );
        optionsProgress.tick(batch.length);
    });
    optionsProgress.done();

    // --- Content pages ------------------------------------------------------
    console.log('Importing content pages…');
    await importContentPages({ mysql, exec, files, archive, config });
    await webPagesImport({ mysql, pg, dryRun: dry, archive });

    // --- Gift cards ---------------------------------------------------------
    // Predecessor allowed null sessionId on paid cards; new schema requires a
    // Sessions FK. For null / unimported sessionIds, insert a terminated
    // synthetic session (bound to buyerId when known) and archive the mapping.
    const gifts = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM GiftCards');
    const importedGiftCardIds = new Set<string>();
    const giftsProgress = progressCreate('Importing GiftCards…', gifts.length);

    async function ensureGiftCardSessionId(gift: RowDataPacket): Promise<string | null> {
        const giftCardId = String(gift.giftCardId);
        const originalSessionId = gift.sessionId ? String(gift.sessionId) : null;
        if (originalSessionId && importedSessionIds.has(originalSessionId)) return originalSessionId;

        const createdAt = asDate(gift.createdAt as Date | string | null) ?? new Date();
        const rawBuyerId = gift.buyerId ? String(gift.buyerId) : null;
        const userId = rawBuyerId && knownUserIds.has(rawBuyerId) ? rawBuyerId : null;
        const syntheticSessionId = idCreate();
        try {
            await exec(
                `INSERT INTO "Sessions" (
                    "sessionId", "userId", "previousSessionId", "lastInteractionAt", "wasTerminatedAt",
                    "connectionActive", "userAgent", "ipHash", "referrer", "landingPath", "geoInformation",
                    "isBot", "createdAt"
                 ) VALUES (
                    $1,$2,NULL,$3,$3,false,$4,NULL,NULL,'/gift-card',NULL,false,$3
                 ) ON CONFLICT ("sessionId") DO NOTHING`,
                [
                    syntheticSessionId,
                    userId,
                    createdAt,
                    syntheticUserAgent({ clientType: 'MIGRATION', platform: 'GIFT_CARD', browser: 'IMPORT' }),
                ],
            );
            importedSessionIds.add(syntheticSessionId);
            await archive.write('GiftCards.syntheticSession', giftCardId, {
                syntheticSessionId,
                originalSessionId,
                buyerId: rawBuyerId,
                reason: originalSessionId ? 'sessionNotImported' : 'nullSessionId',
            });
            return syntheticSessionId;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await recordFailure('GiftCards', giftCardId, `synthetic session failed: ${message}`, gift);
            return null;
        }
    }

    for (const gift of gifts) {
        const giftCardId = String(gift.giftCardId);
        await archive.write('GiftCards.extra', giftCardId, {
            ownerId: gift.ownerId,
            buyerFirstName: gift.buyerFirstName,
            buyerLastName: gift.buyerLastName,
        });

        const paymentData = gift.paymentData as { paymentIntentId?: string; clientSecret?: string } | null;
        const sessionId = await ensureGiftCardSessionId(gift);
        if (!sessionId) {
            giftsProgress.tick();
            continue;
        }

        const rawBuyerId = gift.buyerId ? String(gift.buyerId) : null;
        const buyerUserId = rawBuyerId && knownUserIds.has(rawBuyerId) ? rawBuyerId : null;

        try {
            await exec(
                `INSERT INTO "GiftCards" (
                    "giftCardId", "sessionId", "redeemCode", "originalBalanceCents", "balanceCents",
                    "buyerUserId", "buyerEmail", "occasion", "recipientName", "message",
                    "paymentIntentId", "paymentClientSecret", "paymentStatus", "expiresAt",
                    "invoiceAddress", "locale", "invoiceFileUploadId", "voucherFileUploadId",
                    "cleanupJobId", "createdAt"
                 ) VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,'de',NULL,NULL,NULL,$16
                 ) ON CONFLICT DO NOTHING`,
                [
                    giftCardId,
                    sessionId,
                    String(gift.redeemCode),
                    Number(gift.originalCreditBalanceAmount ?? 0),
                    Number(gift.creditBalanceAmount ?? 0),
                    buyerUserId,
                    String(gift.buyerEmailAddress ?? ''),
                    String(gift.occasion ?? ''),
                    joinName(gift.recipientFirstName as string, gift.recipientLastName as string),
                    String(gift.message ?? ''),
                    paymentData?.paymentIntentId ?? '',
                    paymentData?.clientSecret ?? '',
                    gift.paymentStatus === 'PAYED' ? 'PAYED' : 'PREPARED',
                    asDate(gift.expiresAt as Date | string | null) ?? new Date(),
                    invoiceAddressRename(gift.invoiceAddress as never)
                        ? JSON.stringify(invoiceAddressRename(gift.invoiceAddress as never))
                        : null,
                    asDate(gift.createdAt as Date | string | null) ?? new Date(),
                ],
            );
            importedGiftCardIds.add(giftCardId);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await recordFailure('GiftCards', giftCardId, message);
        }
        giftsProgress.tick();
    }
    giftsProgress.done();

    // --- Booking spine ------------------------------------------------------
    console.log('Importing booking spine…');
    const bookingStartedAt = Date.now();
    await importBookingSpine({
        mysql,
        exec,
        files,
        archive,
        failures,
        config,
        importedSessionIds,
        importedGiftCardIds,
        knownUserIds,
    });
    console.log(`Importing booking spine… done in ${((Date.now() - bookingStartedAt) / 1000).toFixed(1)}s`);

    // Update promo bookingRequestId after booking requests exist
    for (const promo of await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM PromoCodes WHERE bookingRequestId IS NOT NULL')) {
        await exec(`UPDATE "PromoCodes" SET "bookingRequestId" = $1 WHERE "promoCodeId" = $2`, [
            String(promo.bookingRequestId),
            String(promo.promoCodeId),
        ]);
    }

    // --- Testimonials -------------------------------------------------------
    console.log('Importing testimonials…');
    await importTestimonials({ mysql, exec, files, archive, config });

    // --- Support ------------------------------------------------------------
    console.log('Importing support…');
    const importedSupportRequestIds = new Set<string>();
    for (const request of await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM SupportRequests')) {
        const supportRequestId = String(request.supportRequestId);
        const userId = String(request.userId);
        if (!knownUserIds.has(userId)) {
            await archive.write('SupportRequests.missingUser', supportRequestId, request);
            continue;
        }
        try {
            const status = String(request.status ?? 'OPEN');
            const createdAt = asDate(request.createdAt as Date | string | null) ?? new Date();
            const resolvedAt = status === 'RESOLVED' ? (asDate(request.resolvedAt as Date | string | null) ?? createdAt) : null;
            await exec(
                `INSERT INTO "SupportRequests" (
                    "supportRequestId", "userId", "bookingRequestId", "subject", "status",
                    "userUnreadNotificationCount", "adminUnreadNotificationCount",
                    "references", "customerReplyNotifyJobId", "resolvedAt", "createdAt"
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,NULL,$9,$10) ON CONFLICT DO NOTHING`,
                [
                    supportRequestId,
                    userId,
                    request.bookingRequestId ? String(request.bookingRequestId) : null,
                    'Imported support request',
                    status,
                    Number(request.userUnreadNotificationCount ?? 0),
                    Number(request.adminUnreadNotificationCount ?? 0),
                    JSON.stringify(request.references ?? {}),
                    resolvedAt,
                    createdAt,
                ],
            );
            importedSupportRequestIds.add(supportRequestId);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await recordFailure('SupportRequests', supportRequestId, message);
        }
    }

    for (const message of await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM SupportRequestMessages')) {
        const messageId = String(message.supportRequestMessageId);
        const supportRequestId = String(message.supportRequestId);
        const authorUserId = message.senderId ? String(message.senderId) : message.authorUserId ? String(message.authorUserId) : null;
        if (!authorUserId || !knownUserIds.has(authorUserId) || !importedSupportRequestIds.has(supportRequestId)) {
            await archive.write('SupportRequestMessages.unresolvedRefs', messageId, message);
            continue;
        }
        try {
            await exec(
                `INSERT INTO "SupportRequestMessages" (
                    "supportRequestMessageId", "supportRequestId", "authorUserId", "body", "createdAt"
                 ) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
                [
                    messageId,
                    supportRequestId,
                    authorUserId,
                    String(message.message ?? message.content ?? message.body ?? ''),
                    asDate(message.createdAt as Date | string | null) ?? new Date(),
                ],
            );
        } catch (error) {
            const errMessage = error instanceof Error ? error.message : String(error);
            await recordFailure('SupportRequestMessages', messageId, errMessage);
        }
    }

    // --- Feature toggles ----------------------------------------------------
    // Skip: peopleeat toggles are configured in the new app; predecessor
    // percentage / goLive model does not map cleanly and must not overwrite prod defaults.
    console.log('Skipping FeatureToggles import (configure in the new app)');

    // --- Session events (mappable) ------------------------------------------
    // Multi-row INSERT batches + bounded concurrency (same pattern as Sessions /
    // participants). Types in the peopleeat taxonomy import (including legacy
    // keys no longer emitted). Booking-form Next/Send clicks reshape to
    // step_completed via sessionEventPayloadFromLegacy; other payloads get
    // areaName→area only. Unknown types archive; orphan sessionIds are skipped
    // without archive.
    const sessionEvents = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM SessionEvents');
    type SessionEventInsert = { eventId: string; params: unknown[] };
    const sessionEventInserts: SessionEventInsert[] = [];
    const unmappableSessionEvents: Array<{ eventId: string; event: RowDataPacket }> = [];
    let skippedOrphanSessionEvents = 0;
    for (const event of sessionEvents) {
        const type = String(event.type ?? event.key ?? '');
        const sessionId = String(event.sessionId);
        const eventId = String(event.sessionEventId);
        if (!isSessionEventKey(type)) {
            unmappableSessionEvents.push({ eventId, event });
            continue;
        }
        if (!importedSessionIds.has(sessionId)) {
            skippedOrphanSessionEvents += 1;
            continue;
        }
        sessionEventInserts.push({
            eventId,
            params: [
                eventId,
                sessionId,
                type,
                jsonParam(sessionEventPayloadFromLegacy(event.payload)) ?? '{}',
                asDate(event.createdAt as Date | string | null) ?? new Date(),
            ],
        });
    }

    const sessionEventsProgress = progressCreate('Importing SessionEvents…', sessionEvents.length);
    if (skippedOrphanSessionEvents > 0) sessionEventsProgress.tick(skippedOrphanSessionEvents);

    await mapPool(unmappableSessionEvents, config.dbConcurrency, async ({ eventId, event }) => {
        await archive.write('SessionEvents.unmappable', eventId, event);
        sessionEventsProgress.tick();
    });

    await mapPool(chunkArray(sessionEventInserts, config.dbBatchSize), config.dbConcurrency, async (batch) => {
        const valuesSql = batch
            .map((_, rowIndex) => {
                const base = rowIndex * 5;
                return `($${base + 1},$${base + 2},$${base + 3},$${base + 4}::jsonb,$${base + 5})`;
            })
            .join(',');
        try {
            await exec(
                `INSERT INTO "SessionEvents" ("sessionEventId", "sessionId", "type", "payload", "createdAt")
                 VALUES ${valuesSql} ON CONFLICT DO NOTHING`,
                batch.flatMap((row) => row.params),
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`SessionEvents batch failed (${batch.length} rows), retrying one-by-one: ${message}`);
            for (const row of batch) {
                try {
                    await exec(
                        `INSERT INTO "SessionEvents" ("sessionEventId", "sessionId", "type", "payload", "createdAt")
                         VALUES ($1,$2,$3,$4::jsonb,$5) ON CONFLICT DO NOTHING`,
                        row.params,
                    );
                } catch (rowError) {
                    const rowMessage = rowError instanceof Error ? rowError.message : String(rowError);
                    await recordFailure('SessionEvents', row.eventId, rowMessage);
                }
            }
        }
        sessionEventsProgress.tick(batch.length);
    });
    sessionEventsProgress.done();

    // --- Cook call availability / slots -------------------------------------
    console.log('Importing cook call availability…');
    await importCookCalls({ mysql, exec, archive });

    // --- Comms / archives ---------------------------------------------------
    console.log('Importing WhatsApp + archives…');
    await importWhatsAppAndArchives({
        mysql,
        pg,
        dry,
        exec,
        files,
        archive,
        phoneToUserId: claimedPhones,
        knownUserIds,
        importedSessionIds,
    });

    await timeControlledTasksImport({
        mysql,
        pg,
        targetDatabaseUrl: config.targetDatabaseUrl,
        dryRun: dry,
        archive,
    });

    console.log('Domain import complete.');
}

async function importContentPages(args: {
    mysql: MysqlPool;
    exec: (sql: string, params?: unknown[]) => Promise<void>;
    files: FileImporter;
    archive: Archiver;
    config: MigrateConfig;
}): Promise<void> {
    const { mysql, exec, files, archive, config } = args;
    const usedCityPathNames = new Set<string>();
    const usedPartnerPathNames = new Set<string>();
    const usedBlogPathNames = new Set<string>();
    const mediaJobs = mediaFetchJobsCreate();

    const cityRows = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM Cities');
    const cityCookCounts = new Map<string, number>();
    for (const link of await mysqlAll<RowDataPacket>(mysql, 'SELECT cityId, COUNT(*) AS n FROM CityCooks GROUP BY cityId')) {
        cityCookCounts.set(String(link.cityId), Number(link.n ?? 0));
    }
    // Prefer cities with featured cooks / denser sections when slug collisions
    // collapse case variants (e.g. `kassel` vs `Kassel`).
    const sectionCount = (value: unknown): number => legacyJsonArray(value).length;
    cityRows.sort((a, b) => {
        const aId = String(a.cityId);
        const bId = String(b.cityId);
        const cookDelta = (cityCookCounts.get(bId) ?? 0) - (cityCookCounts.get(aId) ?? 0);
        if (cookDelta !== 0) return cookDelta;
        const sectionDelta = sectionCount(b.sections) - sectionCount(a.sections);
        if (sectionDelta !== 0) return sectionDelta;
        const aCreated = asDate(a.createdAt as Date | string | null)?.getTime() ?? 0;
        const bCreated = asDate(b.createdAt as Date | string | null)?.getTime() ?? 0;
        return aCreated - bCreated;
    });

    type CityWork = {
        city: RowDataPacket;
        cityId: string;
        legacySections: LegacyContentSectionImage[];
        pathName: string;
        previousPathNames: string[];
        heroKey: { kind: 'route'; route: string; imageId: string } | { kind: 'url'; url: string } | null;
        firstSectionKey: { kind: 'route'; route: string; imageId: string } | { kind: 'url'; url: string } | null;
    };

    const cityWork: CityWork[] = [];
    for (const city of cityRows) {
        const cityId = String(city.cityId);
        const legacySections = legacyJsonArray<LegacyContentSectionImage>(city.sections);
        const { pathName, previousPathNames } = importPathNameResolve({
            rawPathName: city.pathName ? String(city.pathName) : null,
            entityId: cityId,
            previousPathNames: legacyJsonArray<string>(city.previousPathNames),
            usedPathNames: usedCityPathNames,
        });

        const heroUrl = city.heroImageUrl ? String(city.heroImageUrl) : null;
        const heroFromUrl = peopleEatImageRouteFromUrl(heroUrl);
        const heroKey = heroFromUrl
            ? { kind: 'route' as const, route: heroFromUrl.route, imageId: heroFromUrl.imageId }
            : city.heroImageId
              ? { kind: 'route' as const, route: 'city-hero-images', imageId: String(city.heroImageId) }
              : heroUrl
                ? { kind: 'url' as const, url: heroUrl }
                : null;

        const firstSectionImageUrl = city.firstSectionImageUrl ? String(city.firstSectionImageUrl) : null;
        const firstSectionFromUrl = peopleEatImageRouteFromUrl(firstSectionImageUrl);
        const firstSectionKey = firstSectionFromUrl
            ? { kind: 'route' as const, route: firstSectionFromUrl.route, imageId: firstSectionFromUrl.imageId }
            : city.firstSectionImageId
              ? { kind: 'route' as const, route: 'city-first-section-images', imageId: String(city.firstSectionImageId) }
              : firstSectionImageUrl
                ? { kind: 'url' as const, url: firstSectionImageUrl }
                : null;

        if (heroKey?.kind === 'route') {
            mediaJobs.addRoute(heroKey.route, heroKey.imageId, () => files.ensureFromRoute(heroKey.route, heroKey.imageId));
        } else if (heroKey?.kind === 'url') {
            mediaJobs.addUrl(heroKey.url, () => files.ensureFromUrl(heroKey.url));
        }
        if (firstSectionKey?.kind === 'route') {
            mediaJobs.addRoute(firstSectionKey.route, firstSectionKey.imageId, () =>
                files.ensureFromRoute(firstSectionKey.route, firstSectionKey.imageId),
            );
        } else if (firstSectionKey?.kind === 'url') {
            mediaJobs.addUrl(firstSectionKey.url, () => files.ensureFromUrl(firstSectionKey.url));
        }
        mediaJobs.addSectionImages('city-section-images', legacySections, files);

        cityWork.push({ city, cityId, legacySections, pathName, previousPathNames, heroKey, firstSectionKey });
    }

    const partnerRows = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM Partners');
    type PartnerWork = {
        partner: RowDataPacket;
        partnerId: string;
        legacySections: LegacyContentSectionImage[];
        pathName: string;
        previousPathNames: string[];
        nameDe: string;
        nameEn: string;
        heroKey: { kind: 'route'; route: string; imageId: string } | { kind: 'url'; url: string } | null;
        firstSectionKey: { kind: 'route'; route: string; imageId: string } | { kind: 'url'; url: string } | null;
    };
    const partnerWork: PartnerWork[] = [];
    for (const partner of partnerRows) {
        const partnerId = String(partner.partnerId);
        const legacySections = legacyJsonArray<LegacyContentSectionImage>(partner.sections);
        const { pathName, previousPathNames } = importPathNameResolve({
            rawPathName: partner.pathName ? String(partner.pathName) : null,
            entityId: partnerId,
            previousPathNames: legacyJsonArray<string>(partner.previousPathNames),
            usedPathNames: usedPartnerPathNames,
        });
        const nameDe = String(partner.name ?? '');
        const nameEn = String(partner.nameEnglish ?? partner.nameEn ?? nameDe);

        const heroUrl = partner.heroImageUrl ? String(partner.heroImageUrl) : null;
        const heroFromUrl = peopleEatImageRouteFromUrl(heroUrl);
        const heroKey = heroFromUrl
            ? { kind: 'route' as const, route: heroFromUrl.route, imageId: heroFromUrl.imageId }
            : partner.heroImageId
              ? { kind: 'route' as const, route: 'partner-hero-images', imageId: String(partner.heroImageId) }
              : heroUrl
                ? { kind: 'url' as const, url: heroUrl }
                : null;

        const firstSectionImageUrl = partner.firstSectionImageUrl ? String(partner.firstSectionImageUrl) : null;
        const firstSectionFromUrl = peopleEatImageRouteFromUrl(firstSectionImageUrl);
        const firstSectionKey = firstSectionFromUrl
            ? { kind: 'route' as const, route: firstSectionFromUrl.route, imageId: firstSectionFromUrl.imageId }
            : partner.firstSectionImageId
              ? { kind: 'route' as const, route: 'partner-first-section-images', imageId: String(partner.firstSectionImageId) }
              : firstSectionImageUrl
                ? { kind: 'url' as const, url: firstSectionImageUrl }
                : null;

        if (heroKey?.kind === 'route') {
            mediaJobs.addRoute(heroKey.route, heroKey.imageId, () => files.ensureFromRoute(heroKey.route, heroKey.imageId));
        } else if (heroKey?.kind === 'url') {
            mediaJobs.addUrl(heroKey.url, () => files.ensureFromUrl(heroKey.url));
        }
        if (firstSectionKey?.kind === 'route') {
            mediaJobs.addRoute(firstSectionKey.route, firstSectionKey.imageId, () =>
                files.ensureFromRoute(firstSectionKey.route, firstSectionKey.imageId),
            );
        } else if (firstSectionKey?.kind === 'url') {
            mediaJobs.addUrl(firstSectionKey.url, () => files.ensureFromUrl(firstSectionKey.url));
        }
        mediaJobs.addSectionImages('partner-section-images', legacySections, files);

        partnerWork.push({
            partner,
            partnerId,
            legacySections,
            pathName,
            previousPathNames,
            nameDe,
            nameEn,
            heroKey,
            firstSectionKey,
        });
    }

    const blogRows = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM BlogPosts');
    type BlogWork = {
        post: RowDataPacket;
        blogPostId: string;
        legacySections: LegacyContentSectionImage[];
        pathName: string;
        previousPathNames: string[];
        previewImageId: string | null;
        previewKey: { kind: 'route'; route: string; imageId: string } | { kind: 'url'; url: string } | null;
    };
    const blogWork: BlogWork[] = [];
    for (const post of blogRows) {
        const blogPostId = String(post.blogPostId);
        const legacySections = legacyJsonArray<LegacyContentSectionImage>(post.sections);
        const { pathName, previousPathNames } = importPathNameResolve({
            rawPathName: post.pathName ? String(post.pathName) : null,
            entityId: blogPostId,
            previousPathNames: legacyJsonArray<string>(post.previousPathNames),
            usedPathNames: usedBlogPathNames,
        });
        const previewImageId = post.previewImageId ? String(post.previewImageId) : null;
        const previewUrl = post.previewImageUrl ? String(post.previewImageUrl) : null;
        const previewFromUrl = peopleEatImageRouteFromUrl(previewUrl);
        const previewKey = previewImageId
            ? { kind: 'route' as const, route: 'blog-post-images', imageId: previewImageId }
            : previewFromUrl
              ? { kind: 'route' as const, route: previewFromUrl.route, imageId: previewFromUrl.imageId }
              : previewUrl
                ? { kind: 'url' as const, url: previewUrl }
                : null;

        if (previewKey?.kind === 'route') {
            mediaJobs.addRoute(previewKey.route, previewKey.imageId, () => files.ensureFromRoute(previewKey.route, previewKey.imageId));
        } else if (previewKey?.kind === 'url') {
            mediaJobs.addUrl(previewKey.url, () => files.ensureFromUrl(previewKey.url));
        }
        mediaJobs.addSectionImages('blog-post-images', legacySections, files);

        blogWork.push({ post, blogPostId, legacySections, pathName, previousPathNames, previewImageId, previewKey });
    }

    await runMediaFetchJobs(mediaJobs.values(), config.httpConcurrency, 'Fetching content-page media…');

    function resolveMediaKey(key: { kind: 'route'; route: string; imageId: string } | { kind: 'url'; url: string } | null): string | null {
        if (!key) return null;
        if (key.kind === 'route') return files.getCachedFileUploadId(key.imageId);
        return files.getCachedFileUploadId(key.url);
    }

    const citiesProgress = progressCreate('Importing Cities…', cityWork.length);
    await mapPool(cityWork, config.dbConcurrency, async (item) => {
        const { city, cityId, legacySections, pathName, previousPathNames } = item;
        const remapped = contentSectionsFromLegacy(legacySections as never, (imageId) => files.getCachedFileUploadId(imageId));
        if (remapped.leftovers.length) {
            await archive.write('Cities.extra', cityId, { leftovers: remapped.leftovers });
        }
        await exec(
            `INSERT INTO "Cities" (
                "cityId", "nameDe", "nameEn", "latitude", "longitude", "pathName", "previousPathNames",
                "titleDe", "titleEn", "descriptionDe", "descriptionEn", "headlineDe", "headlineEn",
                "subHeadlineDe", "subHeadlineEn", "heroImageFileUploadId", "sections",
                "firstSectionHeadlineDe", "firstSectionHeadlineEn", "firstSectionBodyDe", "firstSectionBodyEn",
                "firstSectionImageFileUploadId", "publishedAt", "createdAt", "updatedAt"
             ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19,$20,$21,$22,$23,$24,$25
             ) ON CONFLICT DO NOTHING`,
            [
                cityId,
                String(city.name ?? city.nameDe ?? ''),
                String(city.nameEnglish ?? city.nameEn ?? ''),
                Number(city.latitude ?? 0),
                Number(city.longitude ?? 0),
                pathName,
                previousPathNames,
                String(city.title ?? city.titleDe ?? ''),
                String(city.titleEnglish ?? city.titleEn ?? ''),
                String(city.description ?? city.descriptionDe ?? ''),
                String(city.descriptionEnglish ?? city.descriptionEn ?? ''),
                String(city.headline ?? city.headlineDe ?? ''),
                String(city.headlineEnglish ?? city.headlineEn ?? ''),
                String(city.subHeadline ?? city.subHeadlineDe ?? ''),
                String(city.subHeadlineEnglish ?? city.subHeadlineEn ?? ''),
                resolveMediaKey(item.heroKey),
                JSON.stringify(remapped.sections),
                String(city.firstSectionHeadline ?? city.firstSectionHeadlineDe ?? ''),
                String(city.firstSectionHeadlineEnglish ?? city.firstSectionHeadlineEn ?? ''),
                String(city.firstSectionBody ?? city.firstSectionBodyDe ?? ''),
                String(city.firstSectionBodyEnglish ?? city.firstSectionBodyEn ?? ''),
                resolveMediaKey(item.firstSectionKey),
                asDate(city.publishingDate as Date | string | null) ??
                    asDate(city.publishedAt as Date | string | null) ??
                    asDate(city.createdAt as Date | string | null),
                asDate(city.createdAt as Date | string | null) ?? new Date(),
                asDate(city.lastModifiedAt as Date | string | null) ?? new Date(),
            ],
        );
        citiesProgress.tick();
    });
    citiesProgress.done();

    const cityCookLinks = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM CityCooks');
    const cityCooksProgress = progressCreate('Importing CityCooks…', cityCookLinks.length);
    await mapPool(chunkArray(cityCookLinks, config.dbBatchSize), config.dbConcurrency, async (batch) => {
        const valuesSql = batch.map((_, index) => `($${index * 3 + 1},$${index * 3 + 2},$${index * 3 + 3})`).join(',');
        await exec(`INSERT INTO "CityCooks" ("cityId", "cookId", "position") VALUES ${valuesSql} ON CONFLICT DO NOTHING`, [
            ...batch.flatMap((link) => [String(link.cityId), String(link.cookId), Number(link.index ?? link.position ?? 0)]),
        ]);
        cityCooksProgress.tick(batch.length);
    });
    cityCooksProgress.done();

    const partnersProgress = progressCreate('Importing Partners…', partnerWork.length);
    await mapPool(partnerWork, config.dbConcurrency, async (item) => {
        const { partner, partnerId, legacySections, pathName, previousPathNames, nameDe, nameEn } = item;
        const remapped = contentSectionsFromLegacy(legacySections as never, (imageId) => files.getCachedFileUploadId(imageId));
        if (remapped.leftovers.length || partner.headline || partner.headlineEnglish) {
            await archive.write('Partners.extra', partnerId, {
                legacyHeadline: partner.headline,
                legacyHeadlineEnglish: partner.headlineEnglish,
                leftovers: remapped.leftovers,
            });
        }
        await exec(
            `INSERT INTO "Partners" (
                "partnerId", "name", "pathName", "previousPathNames",
                "titleDe", "titleEn", "descriptionDe", "descriptionEn", "headlineDe", "headlineEn",
                "subHeadlineDe", "subHeadlineEn", "heroImageFileUploadId", "sections",
                "firstSectionHeadlineDe", "firstSectionHeadlineEn", "firstSectionBodyDe", "firstSectionBodyEn",
                "firstSectionImageFileUploadId", "promoCodeId", "publishedAt", "createdAt", "updatedAt"
             ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17,$18,$19,$20,$21,$22,$23
             ) ON CONFLICT DO NOTHING`,
            [
                partnerId,
                nameDe,
                pathName,
                previousPathNames,
                String(partner.title ?? partner.titleDe ?? ''),
                String(partner.titleEnglish ?? partner.titleEn ?? ''),
                String(partner.description ?? partner.descriptionDe ?? ''),
                String(partner.descriptionEnglish ?? partner.descriptionEn ?? ''),
                nameDe,
                nameEn,
                String(partner.subHeadline ?? partner.subHeadlineDe ?? ''),
                String(partner.subHeadlineEnglish ?? partner.subHeadlineEn ?? ''),
                resolveMediaKey(item.heroKey),
                JSON.stringify(remapped.sections),
                String(partner.firstSectionHeadline ?? partner.firstSectionHeadlineDe ?? ''),
                String(partner.firstSectionHeadlineEnglish ?? partner.firstSectionHeadlineEn ?? ''),
                String(partner.firstSectionBody ?? partner.firstSectionBodyDe ?? ''),
                String(partner.firstSectionBodyEnglish ?? partner.firstSectionBodyEn ?? ''),
                resolveMediaKey(item.firstSectionKey),
                partner.promoCodeId ? String(partner.promoCodeId) : null,
                partner.isActive === false
                    ? null
                    : (asDate(partner.publishedAt as Date | string | null) ?? asDate(partner.createdAt as Date | string | null)),
                asDate(partner.createdAt as Date | string | null) ?? new Date(),
                asDate(partner.lastModifiedAt as Date | string | null) ?? new Date(),
            ],
        );
        partnersProgress.tick();
    });
    partnersProgress.done();

    const partnerCookLinks = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM PartnerCooks');
    const partnerCooksProgress = progressCreate('Importing PartnerCooks…', partnerCookLinks.length);
    await mapPool(chunkArray(partnerCookLinks, config.dbBatchSize), config.dbConcurrency, async (batch) => {
        const valuesSql = batch.map((_, index) => `($${index * 3 + 1},$${index * 3 + 2},$${index * 3 + 3})`).join(',');
        await exec(`INSERT INTO "PartnerCooks" ("partnerId", "cookId", "position") VALUES ${valuesSql} ON CONFLICT DO NOTHING`, [
            ...batch.flatMap((link) => [String(link.partnerId), String(link.cookId), Number(link.index ?? link.position ?? 0)]),
        ]);
        partnerCooksProgress.tick(batch.length);
    });
    partnerCooksProgress.done();

    const blogsProgress = progressCreate('Importing BlogPosts…', blogWork.length);
    await mapPool(blogWork, config.dbConcurrency, async (item) => {
        const { post, blogPostId, legacySections, pathName, previousPathNames, previewImageId } = item;
        const remapped = contentSectionsFromLegacy(legacySections as never, (imageId) => files.getCachedFileUploadId(imageId));
        const heroImageFileUploadId = previewImageId ? files.getCachedFileUploadId(previewImageId) : resolveMediaKey(item.previewKey);
        if (remapped.leftovers.length) {
            await archive.write('BlogPosts.extra', blogPostId, { leftovers: remapped.leftovers });
        }
        await exec(
            `INSERT INTO "BlogPosts" (
                "blogPostId", "pathName", "previousPathNames",
                "titleDe", "titleEn", "descriptionDe", "descriptionEn", "headlineDe", "headlineEn",
                "subHeadlineDe", "subHeadlineEn", "heroImageFileUploadId", "sections",
                "publishedAt", "createdAt", "updatedAt"
             ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16
             ) ON CONFLICT DO NOTHING`,
            [
                blogPostId,
                pathName,
                previousPathNames,
                String(post.title ?? post.titleDe ?? ''),
                String(post.titleEnglish ?? post.titleEn ?? ''),
                String(post.description ?? post.descriptionDe ?? ''),
                String(post.descriptionEnglish ?? post.descriptionEn ?? ''),
                String(post.headline ?? post.title ?? ''),
                String(post.headlineEnglish ?? post.titleEnglish ?? ''),
                String(post.subHeadline ?? ''),
                String(post.subHeadlineEnglish ?? ''),
                heroImageFileUploadId,
                JSON.stringify(remapped.sections),
                asDate(post.publishingDate as Date | string | null) ?? asDate(post.publishedAt as Date | string | null),
                asDate(post.createdAt as Date | string | null) ?? new Date(),
                asDate(post.lastModifiedAt as Date | string | null) ?? new Date(),
            ],
        );
        blogsProgress.tick();
    });
    blogsProgress.done();
}

async function importBookingSpine(args: {
    mysql: MysqlPool;
    exec: (sql: string, params?: unknown[]) => Promise<void>;
    files: FileImporter;
    archive: Archiver;
    failures: FailureLog;
    config: MigrateConfig;
    importedSessionIds: Set<string>;
    importedGiftCardIds: Set<string>;
    knownUserIds: Set<string>;
}): Promise<void> {
    const { mysql, exec, files, archive, failures, config, importedSessionIds, importedGiftCardIds, knownUserIds } = args;

    async function recordFailure(source: string, sourceId: string, message: string, payload?: unknown): Promise<void> {
        failures.record(source, sourceId, message);
        console.warn(`Skipping ${source} ${sourceId}: ${message}`);
        if (payload !== undefined) {
            await archive.write(
                `${source}.failed`,
                sourceId,
                typeof payload === 'object' ? { ...payload, error: message } : { error: message, payload },
            );
        } else {
            await archive.write(`${source}.failed`, sourceId, { error: message });
        }
    }

    const bookingRequests = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM BookingRequests');
    const importedBookingRequestIds = new Set<string>();
    const bookingRequestsProgress = progressCreate('Importing BookingRequests…', bookingRequests.length);
    for (const request of bookingRequests) {
        const bookingRequestId = String(request.bookingRequestId);
        const userId = String(request.userId);
        if (!knownUserIds.has(userId)) {
            await archive.write('BookingRequests.missingUser', bookingRequestId, request);
            bookingRequestsProgress.tick();
            continue;
        }

        let exactEventAddress = request.exactEventAddress as Record<string, unknown> | null;
        if (!exactEventAddress) {
            exactEventAddress = {
                displayText: String(request.locationName ?? 'Unknown'),
                latitude: Number(request.latitude ?? 0),
                longitude: Number(request.longitude ?? 0),
                addressLine1: String(request.locationName ?? ''),
                addressLine2: '',
                city: '',
                postCode: '',
                state: '',
                country: '',
            };
        }

        const rawGiftCardId = request.giftCardId ? String(request.giftCardId) : null;
        const giftCardId = rawGiftCardId && importedGiftCardIds.has(rawGiftCardId) ? rawGiftCardId : null;
        if (rawGiftCardId && !giftCardId) {
            await archive.write('BookingRequests.missingGiftCard', bookingRequestId, { giftCardId: rawGiftCardId });
        }

        try {
            await exec(
                `INSERT INTO "BookingRequests" (
                    "bookingRequestId", "userId", "occasion", "dateTime", "priceClassType",
                    "originalMessage", "adjustedMessage", "giftCardId", "promoCodeId",
                    "expiresAt", "canceledAt", "cancellationReason", "publicationStatus",
                    "exactEventAddress", "preferences", "references", "invoiceAddress", "createdAt"
                 ) VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16::jsonb,$17::jsonb,$18
                 ) ON CONFLICT DO NOTHING`,
                [
                    bookingRequestId,
                    userId,
                    String(request.occasion ?? ''),
                    asDate(request.dateTime as Date | string | null) ?? new Date(),
                    request.priceClassType ?? null,
                    String(request.originalMessage ?? ''),
                    request.adjustedMessage ?? null,
                    giftCardId,
                    request.promoCodeId ? String(request.promoCodeId) : null,
                    asDate(request.expiresAt as Date | string | null),
                    asDate(request.canceledAt as Date | string | null),
                    request.cancellationReason ?? null,
                    bookingRequestPublicationStatusFromLegacy(request.publicationStatus),
                    JSON.stringify(exactEventAddress),
                    JSON.stringify(request.preferences ?? []),
                    JSON.stringify(request.references ?? {}),
                    invoiceAddressRename(request.invoiceAddress as never)
                        ? JSON.stringify(invoiceAddressRename(request.invoiceAddress as never))
                        : null,
                    asDate(request.createdAt as Date | string | null) ?? new Date(),
                ],
            );
            importedBookingRequestIds.add(bookingRequestId);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await recordFailure('BookingRequests', bookingRequestId, message, {
                publicationStatus: request.publicationStatus ?? null,
            });
        }
        bookingRequestsProgress.tick();
    }
    bookingRequestsProgress.done();

    // Predecessor: type + count. New model: one row per person (name + restrictions).
    const legacyParticipants = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM BookingRequestParticipants');
    type ParticipantInsert = { participantId: string; params: unknown[] };
    const participantInserts: ParticipantInsert[] = [];
    for (const participant of legacyParticipants) {
        const bookingRequestId = String(participant.bookingRequestId);
        if (!importedBookingRequestIds.has(bookingRequestId)) continue;

        const type = bookingRequestParticipantTypeFromLegacy(participant.type);
        const count = Math.max(1, Number(participant.count ?? 1) || 1);
        const baseName =
            typeof participant.name === 'string' && participant.name.trim()
                ? participant.name.trim()
                : type === 'DISCOUNTED'
                  ? 'Discounted guest'
                  : 'Guest';
        const restrictions = Array.isArray(participant.restrictions) ? participant.restrictions.map(String).filter(Boolean) : [];
        const createdAt = asDate(participant.createdAt as Date | string | null) ?? new Date();
        const baseId = String(participant.bookingRequestParticipantId);

        for (let index = 0; index < count; index += 1) {
            const participantId = index === 0 ? baseId : idCreate();
            const name = count === 1 ? baseName : `${baseName} ${index + 1}`;
            participantInserts.push({
                participantId,
                params: [participantId, bookingRequestId, type, name, JSON.stringify(restrictions), createdAt],
            });
        }
    }

    const participantsProgress = progressCreate('Importing BookingRequestParticipants…', participantInserts.length);
    await mapPool(chunkArray(participantInserts, config.dbBatchSize), config.dbConcurrency, async (batch) => {
        const valuesSql = batch
            .map((_, rowIndex) => {
                const base = rowIndex * 6;
                return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5}::jsonb,$${base + 6})`;
            })
            .join(',');
        try {
            await exec(
                `INSERT INTO "BookingRequestParticipants" (
                    "bookingRequestParticipantId", "bookingRequestId", "type", "name", "restrictions", "createdAt"
                 ) VALUES ${valuesSql} ON CONFLICT DO NOTHING`,
                batch.flatMap((row) => row.params),
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`Participant batch failed (${batch.length} rows), retrying one-by-one: ${message}`);
            for (const row of batch) {
                try {
                    await exec(
                        `INSERT INTO "BookingRequestParticipants" (
                            "bookingRequestParticipantId", "bookingRequestId", "type", "name", "restrictions", "createdAt"
                         ) VALUES ($1,$2,$3,$4,$5::jsonb,$6) ON CONFLICT DO NOTHING`,
                        row.params,
                    );
                } catch (rowError) {
                    const rowMessage = rowError instanceof Error ? rowError.message : String(rowError);
                    await recordFailure('BookingRequestParticipants', row.participantId, rowMessage);
                }
            }
        }
        participantsProgress.tick(batch.length);
    });
    participantsProgress.done();

    const cooksLinks = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM BookingRequestCooks');
    type CookLinkInsert = { key: string; params: unknown[] };
    const cookLinkInserts: CookLinkInsert[] = [];
    for (const cook of cooksLinks) {
        const bookingRequestId = String(cook.bookingRequestId);
        const cookId = String(cook.cookId);
        if (!importedBookingRequestIds.has(bookingRequestId) || !knownUserIds.has(cookId)) continue;
        cookLinkInserts.push({
            key: `${cookId}/${bookingRequestId}`,
            params: [
                cookId,
                bookingRequestId,
                cook.menuEvaluation ? JSON.stringify(cook.menuEvaluation) : null,
                Boolean(cook.menuEvaluationLoading),
                cook.declinationReason ?? null,
                asDate(cook.declinedAt as Date | string | null),
                asDate(cook.notifiedAt as Date | string | null),
                asDate(cook.firstOpenedAt as Date | string | null),
            ],
        });
    }

    const cooksProgress = progressCreate('Importing BookingRequestCooks…', cookLinkInserts.length);
    await mapPool(chunkArray(cookLinkInserts, config.dbBatchSize), config.dbConcurrency, async (batch) => {
        const valuesSql = batch
            .map((_, rowIndex) => {
                const base = rowIndex * 8;
                return `($${base + 1},$${base + 2},$${base + 3}::jsonb,$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8})`;
            })
            .join(',');
        try {
            await exec(
                `INSERT INTO "BookingRequestCooks" (
                    "cookId", "bookingRequestId", "menuEvaluation", "menuEvaluationLoading",
                    "declinationReason", "declinedAt", "notifiedAt", "firstOpenedAt"
                 ) VALUES ${valuesSql} ON CONFLICT DO NOTHING`,
                batch.flatMap((row) => row.params),
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`BookingRequestCooks batch failed (${batch.length} rows), retrying one-by-one: ${message}`);
            for (const row of batch) {
                try {
                    await exec(
                        `INSERT INTO "BookingRequestCooks" (
                            "cookId", "bookingRequestId", "menuEvaluation", "menuEvaluationLoading",
                            "declinationReason", "declinedAt", "notifiedAt", "firstOpenedAt"
                         ) VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
                        row.params,
                    );
                } catch (rowError) {
                    const rowMessage = rowError instanceof Error ? rowError.message : String(rowError);
                    await recordFailure('BookingRequestCooks', row.key, rowMessage);
                }
            }
        }
        cooksProgress.tick(batch.length);
    });
    cooksProgress.done();

    const offers = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM BookingRequestOffers');
    const importedOfferIds = new Set<string>();
    const offersProgress = progressCreate('Importing BookingRequestOffers…', offers.length);
    for (const offer of offers) {
        const bookingRequestId = String(offer.bookingRequestId);
        const offerId = String(offer.bookingRequestOfferId);
        if (!importedBookingRequestIds.has(bookingRequestId) || !knownUserIds.has(String(offer.cookId))) {
            offersProgress.tick();
            continue;
        }
        try {
            await exec(
                `INSERT INTO "BookingRequestOffers" (
                    "bookingRequestOfferId", "bookingRequestId", "cookId",
                    "userAccepted", "cookAccepted", "userDeclinationReason", "cookDeclinationReason",
                    "userUnreadNotificationCount", "cookUnreadNotificationCount",
                    "isPriceAutoAdjusted", "userRequestedMenuAdjustments", "travelDistanceKm",
                    "menuPriceCents", "travelExpensesCents", "paymentProviderFeeCents",
                    "platformFeePercentCook", "platformFeePercentCustomer",
                    "platformFeeCentsCook", "platformFeeCentsCustomer", "payoutCentsCook",
                    "totalWithoutDiscountsCentsCustomer", "totalCentsCustomer",
                    "configuredMenu", "paymentData", "paymentStatus",
                    "plannedPaymentPullDateTime", "paymentDateTime", "plannedPayoutDateTime", "payoutDateTime",
                    "createdAt"
                 ) VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,
                    $23::jsonb,$24::jsonb,$25,$26,$27,$28,$29,$30
                 ) ON CONFLICT DO NOTHING`,
                [
                    offerId,
                    bookingRequestId,
                    String(offer.cookId),
                    offer.userAccepted ?? null,
                    offer.cookAccepted ?? null,
                    offer.userDeclinationReason ?? null,
                    offer.cookDeclinationReason ?? null,
                    Number(offer.userUnreadNotificationCount ?? 0),
                    Number(offer.cookUnreadNotificationCount ?? 0),
                    offer.isPriceAutoAdjusted ?? null,
                    offer.userRequestedMenuAdjustments ?? null,
                    offer.travelDistanceKm ?? null,
                    Number(offer.menuPriceAmount ?? 0),
                    Number(offer.travelExpensesAmount ?? 0),
                    Number(offer.paymentProviderFeeAmount ?? 0),
                    Number(offer.platformFeePercentCook ?? 0),
                    Number(offer.platformFeePercentCustomer ?? 0),
                    Number(offer.platformFeeAmountCook ?? 0),
                    Number(offer.platformFeeAmountCustomer ?? 0),
                    Number(offer.payoutAmountCook ?? 0),
                    Number(offer.totalAmountWithoutDiscountsForCustomer ?? 0),
                    offer.totalAmountCustomer ?? null,
                    JSON.stringify(offer.configuredMenu ?? null),
                    JSON.stringify(offer.paymentData ?? null),
                    String(offer.paymentStatus ?? 'EMPTY'),
                    asDate(offer.plannedPaymentPullDateTime as Date | string | null),
                    asDate(offer.paymentDateTime as Date | string | null),
                    asDate(offer.plannedPayoutDateTime as Date | string | null),
                    asDate(offer.payoutDateTime as Date | string | null),
                    asDate(offer.createdAt as Date | string | null) ?? new Date(),
                ],
            );
            importedOfferIds.add(offerId);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await recordFailure('BookingRequestOffers', offerId, message);
        }
        offersProgress.tick();
    }
    offersProgress.done();

    // Menus were inserted before offers (FK order). Patch offer-scoped links so
    // ~880 predecessor offer copies do not stay in cook inventory
    // (`cookMenuFindMany` filters `bookingRequestOfferId IS NULL`).
    console.log('Linking Menus to BookingRequestOffers…');
    const menusForOfferLinks = await mysqlAll<RowDataPacket>(
        mysql,
        'SELECT menuId, bookingRequestOfferId, copyOfMenuId FROM Menus WHERE bookingRequestOfferId IS NOT NULL OR copyOfMenuId IS NOT NULL',
    );
    const knownMenuIds = new Set((await mysqlAll<RowDataPacket>(mysql, 'SELECT menuId FROM Menus')).map((row) => String(row.menuId)));
    let menusLinkedToOffers = 0;
    let menusOfferLinkSkipped = 0;
    const menuLinkProgress = progressCreate('Patching Menu offer links…', menusForOfferLinks.length);
    for (const menu of menusForOfferLinks) {
        const menuId = String(menu.menuId);
        const rawOfferId = menu.bookingRequestOfferId ? String(menu.bookingRequestOfferId) : null;
        const rawCopyOfMenuId = menu.copyOfMenuId ? String(menu.copyOfMenuId) : null;
        const bookingRequestOfferId = rawOfferId && importedOfferIds.has(rawOfferId) ? rawOfferId : null;
        const copyOfMenuId = rawCopyOfMenuId && knownMenuIds.has(rawCopyOfMenuId) ? rawCopyOfMenuId : null;

        if (rawOfferId && !bookingRequestOfferId) {
            menusOfferLinkSkipped += 1;
            await archive.write('Menus.offerNotImported', menuId, {
                bookingRequestOfferId: rawOfferId,
                copyOfMenuId: rawCopyOfMenuId,
            });
            // Hide orphan offer copies from cook inventory until manually reviewed.
            await exec(`UPDATE "Menus" SET "deletedAt" = COALESCE("deletedAt", "createdAt"), "publishedAt" = NULL WHERE "menuId" = $1`, [
                menuId,
            ]);
            menuLinkProgress.tick();
            continue;
        }

        if (!bookingRequestOfferId && !copyOfMenuId) {
            menuLinkProgress.tick();
            continue;
        }

        try {
            await exec(`UPDATE "Menus" SET "bookingRequestOfferId" = $1, "copyOfMenuId" = $2 WHERE "menuId" = $3`, [
                bookingRequestOfferId,
                copyOfMenuId,
                menuId,
            ]);
            if (bookingRequestOfferId) menusLinkedToOffers += 1;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await recordFailure('Menus.offerLink', menuId, message, { bookingRequestOfferId, copyOfMenuId });
        }
        menuLinkProgress.tick();
    }
    menuLinkProgress.done();
    console.log(
        `Menus linked to offers: ${menusLinkedToOffers.toLocaleString('en-US')}; offer-not-imported soft-deleted: ${menusOfferLinkSkipped.toLocaleString('en-US')}`,
    );

    const offerEvents = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM BookingRequestOfferEvents');
    type OfferEventWork = {
        eventId: string;
        offerId: string;
        type: string;
        createdAt: Date;
        payload: Record<string, unknown>;
        mediaUrls: string[];
    };
    const offerEventWork: OfferEventWork[] = [];
    for (const event of offerEvents) {
        const offerId = String(event.bookingRequestOfferId);
        if (!importedOfferIds.has(offerId)) continue;
        const payload = (event.payload ?? {}) as Record<string, unknown>;
        const mediaUrls = ((payload.mediaUrls ?? event.mediaUrls ?? []) as Array<string | { url: string }>)
            .map((media) => (typeof media === 'string' ? media : media.url))
            .filter((url): url is string => Boolean(url));
        offerEventWork.push({
            eventId: String(event.bookingRequestOfferEventId),
            offerId,
            type: String(event.type),
            createdAt: asDate(event.createdAt as Date | string | null) ?? new Date(),
            payload,
            mediaUrls,
        });
    }

    const offerEventsProgress = progressCreate('Importing BookingRequestOfferEvents…', offerEventWork.length);
    const eventsWithoutMedia = offerEventWork.filter((event) => event.mediaUrls.length === 0);
    const eventsWithMedia = offerEventWork.filter((event) => event.mediaUrls.length > 0);

    // Fast path: multi-row batches for events with no media.
    await mapPool(chunkArray(eventsWithoutMedia, config.dbBatchSize), config.dbConcurrency, async (batch) => {
        const valuesSql = batch
            .map((_, rowIndex) => {
                const base = rowIndex * 5;
                return `($${base + 1},$${base + 2},$${base + 3},$${base + 4}::jsonb,$${base + 5})`;
            })
            .join(',');
        try {
            await exec(
                `INSERT INTO "BookingRequestOfferEvents" (
                    "bookingRequestOfferEventId", "bookingRequestOfferId", "type", "payload", "createdAt"
                 ) VALUES ${valuesSql} ON CONFLICT DO NOTHING`,
                batch.flatMap((event) => [
                    event.eventId,
                    event.offerId,
                    event.type,
                    JSON.stringify({ ...event.payload, mediaUrls: undefined, importedFileUploadIds: [] }),
                    event.createdAt,
                ]),
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`OfferEvents batch failed (${batch.length} rows), retrying one-by-one: ${message}`);
            for (const event of batch) {
                try {
                    await exec(
                        `INSERT INTO "BookingRequestOfferEvents" (
                            "bookingRequestOfferEventId", "bookingRequestOfferId", "type", "payload", "createdAt"
                         ) VALUES ($1,$2,$3,$4::jsonb,$5) ON CONFLICT DO NOTHING`,
                        [
                            event.eventId,
                            event.offerId,
                            event.type,
                            JSON.stringify({ ...event.payload, mediaUrls: undefined, importedFileUploadIds: [] }),
                            event.createdAt,
                        ],
                    );
                } catch (rowError) {
                    const rowMessage = rowError instanceof Error ? rowError.message : String(rowError);
                    await recordFailure('BookingRequestOfferEvents', event.eventId, rowMessage, {
                        offerId: event.offerId,
                        type: event.type,
                    });
                }
            }
        }
        offerEventsProgress.tick(batch.length);
    });

    // Media events: parallel workers (HTTP + insert). Insert event before attachments (FK).
    const offerEventConcurrency = Math.max(config.dbConcurrency, config.httpConcurrency);
    await mapPool(eventsWithMedia, offerEventConcurrency, async (event) => {
        const fileUploadIds = (await Promise.all(event.mediaUrls.map(async (url) => files.ensureFromUrl(url)))).filter((id): id is string =>
            Boolean(id),
        );

        try {
            await exec(
                `INSERT INTO "BookingRequestOfferEvents" (
                    "bookingRequestOfferEventId", "bookingRequestOfferId", "type", "payload", "createdAt"
                 ) VALUES ($1,$2,$3,$4::jsonb,$5) ON CONFLICT DO NOTHING`,
                [
                    event.eventId,
                    event.offerId,
                    event.type,
                    JSON.stringify({ ...event.payload, mediaUrls: undefined, importedFileUploadIds: fileUploadIds }),
                    event.createdAt,
                ],
            );

            if (fileUploadIds.length > 0) {
                const valuesSql = fileUploadIds
                    .map((_, index) => {
                        const base = index * 3;
                        return `($${base + 1},$${base + 2},$${base + 3})`;
                    })
                    .join(',');
                await exec(
                    `INSERT INTO "BookingRequestOfferEventAttachments" (
                        "bookingRequestOfferEventId", "fileUploadId", "position"
                     ) VALUES ${valuesSql} ON CONFLICT DO NOTHING`,
                    fileUploadIds.flatMap((fileUploadId, index) => [event.eventId, fileUploadId, index]),
                );
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await recordFailure('BookingRequestOfferEvents', event.eventId, message, {
                offerId: event.offerId,
                type: event.type,
            });
        }
        offerEventsProgress.tick();
    });
    offerEventsProgress.done();

    // Booking-request AI chats are deferred (form path is go-live). Skip archive —
    // keep the MySQL dump if a row is ever needed (same stance as Logs).
    console.log('Skipping BookingRequestChats / BookingRequestChatMessages import (kept in MySQL dump only)');

    // Video call rooms → BookingRequestOfferCallRooms
    const importedCallRoomIds = new Set<string>();
    for (const room of await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM VideoCallRooms')) {
        const roomId = String(room.videoCallRoomId);
        const offerId = String(room.bookingRequestOfferId);
        const createdByUserId = String(room.createdByUserId);
        if (!importedOfferIds.has(offerId) || !knownUserIds.has(createdByUserId)) continue;
        const status = String(room.status ?? 'ACTIVE').toUpperCase() === 'ENDED' ? 'ENDED' : 'ACTIVE';
        try {
            await exec(
                `INSERT INTO "BookingRequestOfferCallRooms" (
                    "bookingRequestOfferCallRoomId", "bookingRequestOfferId", "livekitRoomName",
                    "status", "createdByUserId", "startedAt", "endedAt"
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
                [
                    roomId,
                    offerId,
                    String(room.livekitRoomName ?? ''),
                    status,
                    createdByUserId,
                    asDate(room.startedAt as Date | string | null) ?? new Date(),
                    asDate(room.endedAt as Date | string | null),
                ],
            );
            importedCallRoomIds.add(roomId);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await recordFailure('BookingRequestOfferCallRooms', roomId, message, { offerId });
        }
    }

    for (const participant of await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM VideoCallRoomParticipants')) {
        const participantId = String(participant.videoCallRoomParticipantId);
        const roomId = String(participant.videoCallRoomId);
        const sessionId = String(participant.sessionId);
        if (!importedCallRoomIds.has(roomId)) continue;
        if (!participant.userId || !importedSessionIds.has(sessionId) || !knownUserIds.has(String(participant.userId))) {
            await archive.write('VideoCallRoomParticipants.nullUser', participantId, participant);
            continue;
        }
        try {
            await exec(
                `INSERT INTO "BookingRequestOfferCallRoomParticipants" (
                    "bookingRequestOfferCallRoomParticipantId", "bookingRequestOfferCallRoomId",
                    "sessionId", "userId", "joinedAt", "leftAt"
                 ) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
                [
                    participantId,
                    roomId,
                    sessionId,
                    String(participant.userId),
                    asDate(participant.joinedAt as Date | string | null) ?? new Date(),
                    asDate(participant.leftAt as Date | string | null),
                ],
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await recordFailure('BookingRequestOfferCallRoomParticipants', participantId, message, { roomId });
        }
    }
}

async function importTestimonials(args: {
    mysql: MysqlPool;
    exec: (sql: string, params?: unknown[]) => Promise<void>;
    files: FileImporter;
    archive: Archiver;
    config: MigrateConfig;
}): Promise<void> {
    const { mysql, exec, files, config } = args;

    async function rewriteImageUrls(urls: unknown): Promise<string[]> {
        const list = Array.isArray(urls) ? urls.map(String) : [];
        // Few URLs per testimonial; outer mapPool already bounds HTTP concurrency.
        return Promise.all(
            list.map(async (url) => {
                const fileUploadId = await files.ensureFromUrl(url);
                return fileUploadId ? fileUploadPublicUrl(fileUploadId) : url;
            }),
        );
    }

    const customerRows = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM CustomerTestimonials');
    const customerProgress = progressCreate('Importing CustomerTestimonials…', customerRows.length);
    await mapPool(customerRows, config.httpConcurrency, async (row) => {
        const imageUrls = await rewriteImageUrls(row.imageUrls);
        await exec(
            `INSERT INTO "CustomerTestimonials" (
                "customerTestimonialId", "userId", "bookingRequestOfferId", "authorName", "location",
                "occasion", "body", "imageUrls", "rating", "publicationStatus", "publishedAt", "createdAt"
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12) ON CONFLICT DO NOTHING`,
            [
                String(row.customerTestimonialId),
                String(row.userId),
                row.bookingRequestOfferId ? String(row.bookingRequestOfferId) : null,
                row.authorName ?? null,
                row.location ?? null,
                row.occasion ?? null,
                String(row.body ?? ''),
                JSON.stringify(imageUrls),
                row.rating ?? null,
                String(row.publicationStatus ?? 'PUBLISHED'),
                asDate(row.publishedAt as Date | string | null),
                asDate(row.createdAt as Date | string | null) ?? new Date(),
            ],
        );
        customerProgress.tick();
    });
    customerProgress.done();

    const cookRows = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM CookTestimonials');
    const cookProgress = progressCreate('Importing CookTestimonials…', cookRows.length);
    await mapPool(cookRows, config.httpConcurrency, async (row) => {
        const imageUrls = await rewriteImageUrls(row.imageUrls);
        const cookId = String(row.cookId);
        await exec(
            `INSERT INTO "CookTestimonials" (
                "cookTestimonialId", "userId", "cookId", "bookingRequestOfferId", "authorName", "location",
                "occasion", "body", "imageUrls", "rating", "lowRatingAnswers", "publicationStatus",
                "publishedAt", "createdAt"
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11::jsonb,$12,$13,$14) ON CONFLICT DO NOTHING`,
            [
                String(row.cookTestimonialId),
                row.userId ? String(row.userId) : cookId,
                cookId,
                row.bookingRequestOfferId ? String(row.bookingRequestOfferId) : null,
                row.authorName ?? null,
                row.location ?? null,
                row.occasion ?? null,
                row.body ?? null,
                JSON.stringify(imageUrls),
                row.rating ?? null,
                row.lowRatingAnswers ? JSON.stringify(row.lowRatingAnswers) : null,
                String(row.publicationStatus ?? 'PUBLISHED'),
                asDate(row.publishedAt as Date | string | null),
                asDate(row.createdAt as Date | string | null) ?? new Date(),
            ],
        );
        cookProgress.tick();
    });
    cookProgress.done();

    const cityTestimonialLinks = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM CityTestimonials');
    const cityTestimonialProgress = progressCreate('Importing CityTestimonials…', cityTestimonialLinks.length);
    await mapPool(chunkArray(cityTestimonialLinks, config.dbBatchSize), config.dbConcurrency, async (batch) => {
        const valuesSql = batch.map((_, index) => `($${index * 4 + 1},$${index * 4 + 2},$${index * 4 + 3},$${index * 4 + 4})`).join(',');
        await exec(
            `INSERT INTO "CityTestimonials" ("cityId", "testimonialType", "testimonialId", "index")
             VALUES ${valuesSql} ON CONFLICT DO NOTHING`,
            batch.flatMap((row) => [String(row.cityId), String(row.testimonialType), String(row.testimonialId), Number(row.index ?? 0)]),
        );
        cityTestimonialProgress.tick(batch.length);
    });
    cityTestimonialProgress.done();

    const partnerTestimonialLinks = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM PartnerTestimonials');
    const partnerTestimonialProgress = progressCreate('Importing PartnerTestimonials…', partnerTestimonialLinks.length);
    await mapPool(chunkArray(partnerTestimonialLinks, config.dbBatchSize), config.dbConcurrency, async (batch) => {
        const valuesSql = batch.map((_, index) => `($${index * 4 + 1},$${index * 4 + 2},$${index * 4 + 3},$${index * 4 + 4})`).join(',');
        await exec(
            `INSERT INTO "PartnerTestimonials" ("partnerId", "testimonialType", "testimonialId", "index")
             VALUES ${valuesSql} ON CONFLICT DO NOTHING`,
            batch.flatMap((row) => [String(row.partnerId), String(row.testimonialType), String(row.testimonialId), Number(row.index ?? 0)]),
        );
        partnerTestimonialProgress.tick(batch.length);
    });
    partnerTestimonialProgress.done();
}

async function importCookCalls(args: {
    mysql: MysqlPool;
    exec: (sql: string, params?: unknown[]) => Promise<void>;
    archive: Archiver;
}): Promise<void> {
    const { mysql, exec, archive } = args;

    for (const rule of await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM CookCallAvailabilityRules')) {
        await exec(
            `INSERT INTO "CookCallAvailabilityRules" (
                "cookCallAvailabilityRuleId", "cookId", "dayOfWeek", "startMinuteOfDay", "endMinuteOfDay",
                "createdAt", "updatedAt"
             ) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
            [
                String(rule.cookCallAvailabilityRuleId),
                String(rule.cookId),
                Number(rule.dayOfWeek),
                Number(rule.startMinuteOfDay),
                Number(rule.endMinuteOfDay),
                asDate(rule.createdAt as Date | string | null) ?? new Date(),
                asDate(rule.lastModifiedAt as Date | string | null) ?? new Date(),
            ],
        );
    }

    for (const exception of await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM CookCallAvailabilityExceptions')) {
        await exec(
            `INSERT INTO "CookCallAvailabilityExceptions" (
                "cookCallAvailabilityExceptionId", "cookId", "date", "type",
                "startMinuteOfDay", "endMinuteOfDay", "createdAt", "updatedAt"
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
            [
                String(exception.cookCallAvailabilityExceptionId),
                String(exception.cookId),
                asDateString(exception.date as Date | string | null),
                String(exception.type),
                exception.startMinuteOfDay ?? null,
                exception.endMinuteOfDay ?? null,
                asDate(exception.createdAt as Date | string | null) ?? new Date(),
                asDate(exception.lastModifiedAt as Date | string | null) ?? new Date(),
            ],
        );
    }

    for (const booking of await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM CookCallSlotBookings')) {
        if (!booking.bookingRequestOfferId) {
            await archive.write('CookCallSlotBookings.missingOffer', String(booking.cookCallSlotBookingId), booking);
            continue;
        }
        await exec(
            `INSERT INTO "CookCallSlotBookings" (
                "cookCallSlotBookingId", "cookId", "userId", "bookingRequestOfferId",
                "startAt", "endAt", "status", "initiator", "customerMessage", "cookMessage",
                "declineReason", "canceledBy", "canceledReason", "videoCallRoomId",
                "createdAt", "lastModifiedAt"
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT DO NOTHING`,
            [
                String(booking.cookCallSlotBookingId),
                String(booking.cookId),
                String(booking.userId),
                String(booking.bookingRequestOfferId),
                asDate((booking.startAt ?? booking.startsAt) as Date | string | null) ?? new Date(),
                asDate((booking.endAt ?? booking.endsAt) as Date | string | null) ?? new Date(),
                String(booking.status ?? 'PENDING'),
                String(booking.initiator ?? 'CUSTOMER'),
                booking.customerMessage ?? null,
                booking.cookMessage ?? null,
                booking.declineReason ?? null,
                booking.canceledBy ?? null,
                booking.canceledReason ?? null,
                booking.videoCallRoomId ? String(booking.videoCallRoomId) : null,
                asDate(booking.createdAt as Date | string | null) ?? new Date(),
                asDate((booking.lastModifiedAt ?? booking.updatedAt) as Date | string | null) ?? new Date(),
            ],
        );
    }
}

async function importWhatsAppAndArchives(args: {
    mysql: MysqlPool;
    pg: PgPool;
    dry: boolean;
    exec: (sql: string, params?: unknown[]) => Promise<void>;
    files: FileImporter;
    archive: Archiver;
    phoneToUserId: Map<string, string>;
    knownUserIds: Set<string>;
    importedSessionIds: Set<string>;
}): Promise<void> {
    const { mysql, pg, dry, exec, files, archive, phoneToUserId, knownUserIds, importedSessionIds } = args;

    const externalMessages = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM ExternalMessages ORDER BY createdAt ASC');
    const conversationIds = new Map<string, string>();

    for (const message of externalMessages) {
        const channel = String(message.channel);
        const messageId = String(message.messageId);

        if (channel !== 'WHATS_APP') {
            await archive.write(`ExternalMessages.${channel}`, messageId, message);
            continue;
        }

        const phoneNumber = String(message.contactReference ?? '').trim();
        if (!phoneNumber) {
            await archive.write('ExternalMessages.WhatsApp.noPhone', messageId, message);
            continue;
        }

        const userId = phoneToUserId.get(phoneNumber) ?? null;
        let conversationId = conversationIds.get(phoneNumber);
        if (!conversationId) {
            conversationId = idCreate();
            if (!dry) {
                await pg.query(
                    `INSERT INTO "WhatsAppConversations" (
                        "whatsAppConversationId", "phoneNumber", "displayName", "userId",
                        "lastMessageAt", "adminUnreadCount", "createdAt"
                     ) VALUES ($1,$2,$3,$4,$5,0,$6) ON CONFLICT ("phoneNumber") DO NOTHING`,
                    [
                        conversationId,
                        phoneNumber,
                        message.externalUserName ? String(message.externalUserName) : null,
                        userId,
                        asDate(message.createdAt as Date | string | null) ?? new Date(),
                        asDate(message.createdAt as Date | string | null) ?? new Date(),
                    ],
                );
                const existing = await pg.query<{ whatsAppConversationId: string }>(
                    `SELECT "whatsAppConversationId" FROM "WhatsAppConversations" WHERE "phoneNumber" = $1`,
                    [phoneNumber],
                );
                conversationId = existing.rows[0]?.whatsAppConversationId ?? conversationId;
                if (userId) {
                    await pg.query(`UPDATE "WhatsAppConversations" SET "userId" = COALESCE("userId", $2) WHERE "phoneNumber" = $1`, [
                        phoneNumber,
                        userId,
                    ]);
                }
            }
            conversationIds.set(phoneNumber, conversationId);
        }

        const direction = String(message.type) === 'SENT' ? 'OUTBOUND' : 'INBOUND';
        const whatsAppMessageId = messageId;
        const mediaUrls = (message.mediaUrls ?? []) as Array<{ url: string; type?: string; mimeType?: string }>;
        const messageKind = mediaUrls.length > 0 ? 'MEDIA' : 'TEXT';
        await exec(
            `INSERT INTO "WhatsAppMessages" (
                "whatsAppMessageId", "whatsAppConversationId", "direction", "messageKind", "body",
                "providerMessageId", "readAt", "deliveredAt", "createdAt"
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
            [
                whatsAppMessageId,
                conversationId,
                direction,
                messageKind,
                String(message.content ?? ''),
                message.referenceId ? String(message.referenceId) : null,
                asDate(message.readAt as Date | string | null),
                asDate(message.deliveredAt as Date | string | null),
                asDate(message.createdAt as Date | string | null) ?? new Date(),
            ],
        );

        for (const [index, media] of mediaUrls.entries()) {
            const fileUploadId = await files.ensureFromUrl(media.url);
            if (!fileUploadId) continue;
            await exec(
                `INSERT INTO "WhatsAppMessageAttachments" ("whatsAppMessageId", "fileUploadId", "position")
                 VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
                [whatsAppMessageId, fileUploadId, index],
            );
        }
    }

    const newsletterRows = await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM NewsletterSubscriptions');
    const newsletterProgress = progressCreate('Importing NewsletterSubscriptions…', newsletterRows.length);
    for (const row of newsletterRows) {
        const emailAddress = String(row.emailAddress ?? '')
            .trim()
            .toLowerCase();
        if (!emailAddress) {
            await archive.write('NewsletterSubscriptions.invalid', String(row.newsletterSubscriptionId ?? idCreate()), row);
            newsletterProgress.tick(1);
            continue;
        }
        const userIdRaw = row.userId ? String(row.userId) : null;
        const userId = userIdRaw && knownUserIds.has(userIdRaw) ? userIdRaw : null;
        const sessionIdRaw = row.sessionId ? String(row.sessionId) : null;
        const sessionId = sessionIdRaw && importedSessionIds.has(sessionIdRaw) ? sessionIdRaw : null;
        let locale = 'de';
        if (!dry && userId) {
            const { rows: userRows } = await pg.query<{ locale: string }>(`SELECT "locale" FROM "Users" WHERE "userId" = $1`, [userId]);
            locale = userRows[0]?.locale ?? 'de';
        }
        await exec(
            `INSERT INTO "NewsletterSubscriptions" (
                "newsletterSubscriptionId", "emailAddress", "userId", "sessionId", "locale", "source", "createdAt"
             ) VALUES ($1,$2,$3,$4,$5,'IMPORT',$6) ON CONFLICT ("emailAddress") DO NOTHING`,
            [idCreate(), emailAddress, userId, sessionId, locale, asDate(row.createdAt as Date | string | null) ?? new Date()],
        );
        newsletterProgress.tick(1);
    }
    newsletterProgress.done();

    for (const row of await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM OneTimeAccesses')) {
        await archive.write('OneTimeAccesses', String(row.userId), { userId: row.userId, createdAt: row.createdAt });
    }

    for (const row of await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM AdminAssistantChats')) {
        await archive.write('AdminAssistantChats', String(row.adminAssistantChatId), row);
    }
    for (const row of await mysqlAll<RowDataPacket>(mysql, 'SELECT * FROM AdminAssistantChatMessages')) {
        await archive.write('AdminAssistantChatMessages', String(row.adminAssistantChatMessageId), row);
    }

    // Skip Logs → MigrationArchive: low product value and can dominate archive volume.
    // Keep the MySQL dump if a log row is ever needed.
    console.log('Skipping Logs import (kept in MySQL dump only)');
}
