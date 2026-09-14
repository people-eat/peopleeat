import type { Pool as MysqlPool, RowDataPacket } from 'mysql2/promise';
import type { Pool as PgPool } from 'pg';

import type { WebPageKey } from '../../src/shared/webPage';
import { webPageDefaults, webPageKeys } from '../../src/shared/webPage';
import type { Archiver } from './archive';

/** Predecessor WebPages.webPageKey → peopleeat WebPageKey (or null = archive only). */
const webPageKeyMap: Record<string, WebPageKey | null> = {
    LANDING: 'LANDING',
    CITIES: 'CITIES',
    PARTNERS: 'PARTNERS',
    EVENTS: 'OCCASIONS',
    COOKS: 'CHEFS',
    BLOG_POSTS: 'BLOG_POSTS',
    ABOUT_US: 'ABOUT_US',
    GIFT_CARD: 'GIFT_CARD',
    HOW_TO_BECOME_A_COOK: 'HOW_TO_BECOME_A_CHEF',
    BOOKING_REQUEST: 'BOOKING_REQUEST',
    BOOKING_REQUEST_FORM: 'BOOKING_REQUEST_FORM',
    BOOKING_REQUEST_CHAT: 'BOOKING_REQUEST_CHAT',
    COOK_SIGN_UP: 'CHEF_SIGN_UP',
    IMPRINT: 'IMPRINT',
    TERMS_AND_CONDITIONS: 'TERMS_AND_CONDITIONS',
    PRIVACY_POLICY: 'PRIVACY_POLICY',
    SIGN_IN: 'SIGN_IN',
    PROFILE: 'PROFILE',
    ADMINISTRATION: 'ADMINISTRATION',
    // Dropped / entity-owned SEO in the new app
    SIGN_UP: null,
    COOK: null,
    CITY: null,
    BLOG_POST: null,
    EVENT: null,
    PARTNER: null,
    OCCASIONS: 'OCCASIONS',
    CHEFS: 'CHEFS',
    HOW_TO_BECOME_A_CHEF: 'HOW_TO_BECOME_A_CHEF',
    CHEF_SIGN_UP: 'CHEF_SIGN_UP',
};

function nonEmpty(value: unknown, fallback: string): string {
    const trimmed = String(value ?? '').trim();
    return trimmed.length > 0 ? trimmed : fallback;
}

/**
 * Upsert mapped predecessor WebPages into peopleeat `WebPages`. Unmapped keys
 * (detail pages, PROFILE_*, SIGN_UP, …) go to MigrationArchive.
 */
export async function webPagesImport(args: { mysql: MysqlPool; pg: PgPool; dryRun: boolean; archive: Archiver }): Promise<void> {
    const { mysql, pg, dryRun, archive } = args;
    console.log('Importing WebPages…');

    let rows: RowDataPacket[];
    try {
        const [result] = await mysql.query<RowDataPacket[]>('SELECT * FROM WebPages');
        rows = result;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/doesn't exist|ER_NO_SUCH_TABLE/i.test(message)) {
            console.warn('Skipping WebPages (table missing)');
            return;
        }
        throw error;
    }

    const importedKeys = new Set<WebPageKey>();
    const now = new Date();

    for (const page of rows) {
        const oldKey = String(page.webPageKey ?? page.key ?? '');
        const newKey = webPageKeyMap[oldKey];
        if (newKey == null || !(webPageKeys as readonly string[]).includes(newKey)) {
            await archive.write('WebPages.unmapped', oldKey || 'unknown', page);
            continue;
        }

        const defaults = webPageDefaults[newKey];
        const titleDe = nonEmpty(page.title ?? page.titleDe, defaults.titleDe);
        const titleEn = nonEmpty(page.titleEnglish ?? page.titleEn, defaults.titleEn);
        const descriptionDe = nonEmpty(page.description ?? page.descriptionDe, defaults.descriptionDe);
        const descriptionEn = nonEmpty(page.descriptionEnglish ?? page.descriptionEn, defaults.descriptionEn);

        if (!dryRun) {
            await pg.query(
                `INSERT INTO "WebPages" (
                    "webPageKey", "titleDe", "titleEn", "descriptionDe", "descriptionEn", "updatedAt"
                 ) VALUES ($1,$2,$3,$4,$5,$6)
                 ON CONFLICT ("webPageKey") DO UPDATE SET
                    "titleDe" = EXCLUDED."titleDe",
                    "titleEn" = EXCLUDED."titleEn",
                    "descriptionDe" = EXCLUDED."descriptionDe",
                    "descriptionEn" = EXCLUDED."descriptionEn",
                    "updatedAt" = EXCLUDED."updatedAt"`,
                [newKey, titleDe, titleEn, descriptionDe, descriptionEn, now],
            );
        }
        importedKeys.add(newKey);
    }

    console.log(`  WebPages upserted: ${importedKeys.size}; unmapped archived when present`);
}
