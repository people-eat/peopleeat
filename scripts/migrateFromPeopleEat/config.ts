import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: ['.env.local'] });

export type MigrateConfig = {
    sourceMysqlUrl: string;
    targetDatabaseUrl: string;
    sourceWebOrigin: string;
    visitorIpHashSalt: string;
    dryRun: boolean;
    verifyOnly: boolean;
    httpConcurrency: number;
    httpTimeoutMs: number;
    /** Parallel Postgres INSERT batches (sessions, cookies, …). */
    dbConcurrency: number;
    /** Rows per multi-row INSERT. */
    dbBatchSize: number;
};

function requireEnv(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) {
        console.error(`${name} is not set`);
        process.exit(1);
    }
    return value;
}

export function migrateConfigFromArgv(argv: string[]): MigrateConfig {
    const dryRun = argv.includes('--dry-run');
    const verifyOnly = argv.includes('--verify-only');

    return {
        sourceMysqlUrl: requireEnv('SOURCE_MYSQL_URL'),
        targetDatabaseUrl: process.env.TARGET_DATABASE_URL?.trim() || requireEnv('DATABASE_URL'),
        sourceWebOrigin: (process.env.SOURCE_WEB_ORIGIN?.trim() || 'https://people-eat.com').replace(/\/$/, ''),
        visitorIpHashSalt: requireEnv('VISITOR_IP_HASH_SALT'),
        dryRun,
        verifyOnly,
        httpConcurrency: Number(process.env.MIGRATE_HTTP_CONCURRENCY ?? '12'),
        httpTimeoutMs: Number(process.env.MIGRATE_HTTP_TIMEOUT_MS ?? '30000'),
        dbConcurrency: Number(process.env.MIGRATE_DB_CONCURRENCY ?? '8'),
        dbBatchSize: Number(process.env.MIGRATE_DB_BATCH_SIZE ?? '100'),
    };
}
