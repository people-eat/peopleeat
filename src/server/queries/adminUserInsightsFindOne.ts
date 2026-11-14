import { and, count, desc, eq, exists, isNotNull, ne, not, notExists, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import {
    authOauthIdentities,
    authPasskeys,
    authTimeBasedOneTimePasswords,
    bookingRequestOffers,
    bookingRequests,
    cooks,
    users,
} from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminUserAgeStat, GqlSAdminUserInsights, GqlSSession } from '../graphql/generated';

const TIME_ZONE_STATS_TAKE = 12;

function parseNullableNumber(value: string | number | null | undefined): number | null {
    if (value == null || value === '') return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(parsed) ? null : parsed;
}

function toAgeStat(
    row:
        | {
              medianAge: string | number | null | undefined;
              averageAge: string | number | null | undefined;
              birthDateSampleSize: number | null | undefined;
          }
        | null
        | undefined,
): GqlSAdminUserAgeStat {
    return {
        medianAge: parseNullableNumber(row?.medianAge),
        averageAge: parseNullableNumber(row?.averageAge),
        birthDateSampleSize: row?.birthDateSampleSize ?? 0,
    };
}

function dualAcceptedBookingExists(db: ServerRuntime['db']): SQL {
    return exists(
        db
            .select()
            .from(bookingRequests)
            .innerJoin(bookingRequestOffers, eq(bookingRequestOffers.bookingRequestId, bookingRequests.bookingRequestId))
            .where(
                and(
                    eq(bookingRequests.userId, users.userId),
                    eq(bookingRequestOffers.userAccepted, true),
                    eq(bookingRequestOffers.cookAccepted, true),
                ),
            ),
    );
}

/** Demographic / preference aggregates for the admin users overview. */
export async function adminUserInsightsFindOne(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminUserInsights> {
    try {
        const db = serverRuntime.db;
        const notAnonymized = ne(users.status, 'ANONYMIZED');
        const withBirthDate = and(notAnonymized, isNotNull(users.birthDate));
        const isCook = exists(db.select().from(cooks).where(eq(cooks.cookId, users.userId)));
        const isCustomer = notExists(db.select().from(cooks).where(eq(cooks.cookId, users.userId)));
        const hasDualAcceptedBooking = dualAcceptedBookingExists(db);

        const ageSelect = {
            medianAge: sql<
                string | number | null
            >`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY DATE_PART('year', AGE(CURRENT_DATE, ${users.birthDate})))`,
            averageAge: sql<string | number | null>`AVG(DATE_PART('year', AGE(CURRENT_DATE, ${users.birthDate})))`,
            birthDateSampleSize: count(),
        };

        function ageWhere(extra: SQL | undefined) {
            return db
                .select(ageSelect)
                .from(users)
                .where(and(withBirthDate, extra))
                .then((rows) => rows[0]);
        }

        const [
            accountRow,
            cookAgeRow,
            potentialCustomerAgeRow,
            actualCustomerAgeRow,
            preferredCommunicationRows,
            localeRows,
            timeZoneRows,
            googleLinkedRow,
            passkeyRow,
            totpRow,
        ] = await Promise.all([
            db
                .select({ value: count() })
                .from(users)
                .where(notAnonymized)
                .then((rows) => rows[0]),
            ageWhere(isCook),
            ageWhere(and(isCustomer, not(hasDualAcceptedBooking))),
            ageWhere(and(isCustomer, hasDualAcceptedBooking)),
            db
                .select({
                    preferredCommunication: users.preferredCommunication,
                    value: count(),
                })
                .from(users)
                .where(notAnonymized)
                .groupBy(users.preferredCommunication)
                .orderBy(desc(count())),
            db
                .select({
                    locale: users.locale,
                    value: count(),
                })
                .from(users)
                .where(notAnonymized)
                .groupBy(users.locale)
                .orderBy(desc(count()), users.locale),
            db
                .select({
                    timeZone: users.timeZone,
                    value: count(),
                })
                .from(users)
                .where(notAnonymized)
                .groupBy(users.timeZone)
                .orderBy(desc(count()), users.timeZone)
                .limit(TIME_ZONE_STATS_TAKE),
            db
                .select({ value: count() })
                .from(authOauthIdentities)
                .innerJoin(users, eq(users.userId, authOauthIdentities.userId))
                .where(and(notAnonymized, eq(authOauthIdentities.provider, 'GOOGLE')))
                .then((rows) => rows[0]),
            db
                .select({ value: sql<number>`count(distinct ${authPasskeys.userId})` })
                .from(authPasskeys)
                .innerJoin(users, eq(users.userId, authPasskeys.userId))
                .where(notAnonymized)
                .then((rows) => rows[0]),
            db
                .select({ value: count() })
                .from(authTimeBasedOneTimePasswords)
                .innerJoin(users, eq(users.userId, authTimeBasedOneTimePasswords.userId))
                .where(and(notAnonymized, isNotNull(authTimeBasedOneTimePasswords.confirmedAt)))
                .then((rows) => rows[0]),
        ]);

        return {
            accountCount: accountRow?.value ?? 0,
            ageBySegment: {
                cooks: toAgeStat(cookAgeRow),
                potentialCustomers: toAgeStat(potentialCustomerAgeRow),
                actualCustomers: toAgeStat(actualCustomerAgeRow),
            },
            preferredCommunication: preferredCommunicationRows.map((row) => ({
                preferredCommunication: row.preferredCommunication ?? null,
                count: row.value,
            })),
            locales: localeRows.map((row) => ({
                locale: row.locale,
                count: row.value,
            })),
            timeZones: timeZoneRows.map((row) => ({
                timeZone: row.timeZone,
                count: row.value,
            })),
            googleLinkedAccountCount: Number(googleLinkedRow?.value ?? 0),
            passkeyAccountCount: Number(passkeyRow?.value ?? 0),
            totpAccountCount: Number(totpRow?.value ?? 0),
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
