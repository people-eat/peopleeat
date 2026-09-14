import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Pool as MysqlPool, RowDataPacket } from 'mysql2/promise';
import type { Pool as PgPool } from 'pg';

import { idCreate } from '../../src/shared/idCreate';
import { asDate } from './transforms';

const legalDir = join(dirname(fileURLToPath(import.meta.url)), 'legal');

type LegalKind = 'privacy' | 'terms' | 'imprint';

const legalFiles: Record<LegalKind, { file: string; table: string; idColumn: string; summary: string }> = {
    privacy: {
        file: 'privacy-policy.md',
        table: 'AdminLegalPrivacyPolicies',
        idColumn: 'privacyPolicyId',
        summary: 'Go-live import from people-eat (Datenschutzerklärung).',
    },
    terms: {
        file: 'terms-and-conditions.md',
        table: 'AdminLegalTermsAndConditions',
        idColumn: 'termsAndConditionsId',
        summary: 'Go-live import from people-eat (AGB).',
    },
    imprint: {
        file: 'imprint.md',
        table: 'AdminLegalImprints',
        idColumn: 'imprintId',
        summary: 'Go-live import from people-eat (Impressum).',
    },
};

/**
 * Choose `publishedAt` so imported `Users.lastAccepted*` stay valid (no mass
 * re-accept gate). Uses the earliest non-null acceptance from MySQL, falling
 * back to 2020-01-01 UTC when none exist.
 */
async function publishedAtResolve(mysql: MysqlPool): Promise<Date> {
    const [rows] = await mysql.query<RowDataPacket[]>(
        `SELECT LEAST(
            COALESCE(MIN(lastAcceptedPrivacyPolicy), '9999-12-31'),
            COALESCE(MIN(lastAcceptedTerms), '9999-12-31')
         ) AS earliest
         FROM Users
         WHERE lastAcceptedPrivacyPolicy IS NOT NULL OR lastAcceptedTerms IS NOT NULL`,
    );
    const raw = rows[0]?.earliest;
    const parsed = asDate(raw as Date | string | null);
    if (parsed && parsed.getFullYear() < 9000) {
        return parsed;
    }
    return new Date('2020-01-01T00:00:00.000Z');
}

/**
 * Insert published legal versions **before** Users so public pages and the
 * acceptance gate have a current document on cutover.
 */
export async function legalImport(args: { mysql: MysqlPool; pg: PgPool; dryRun: boolean }): Promise<void> {
    const { mysql, pg, dryRun } = args;
    const publishedAt = await publishedAtResolve(mysql);
    console.log(`Importing published legal texts (publishedAt=${publishedAt.toISOString()})…`);

    const now = new Date();
    for (const kind of Object.keys(legalFiles) as LegalKind[]) {
        const meta = legalFiles[kind];
        const bodyDe = readFileSync(join(legalDir, meta.file), 'utf8');
        if (!bodyDe.trim()) {
            throw new Error(`legalImport: empty body for ${meta.file}`);
        }
        const id = idCreate();
        if (dryRun) {
            console.log(`  [dry-run] ${meta.table} (${bodyDe.length} chars)`);
            continue;
        }
        await pg.query(
            `INSERT INTO "${meta.table}" (
                "${meta.idColumn}", "bodyDe", "changeSummaryDe", "createdAt", "updatedAt", "publishedAt"
             ) VALUES ($1,$2,$3,$4,$5,$6)`,
            [id, bodyDe.endsWith('\n') ? bodyDe : `${bodyDe}\n`, meta.summary, now, now, publishedAt],
        );
        console.log(`  ${meta.table}: published`);
    }
}
