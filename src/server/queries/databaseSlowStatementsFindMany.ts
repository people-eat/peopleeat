import { sql } from 'drizzle-orm';

import type { Database } from '../db';

export type DatabaseSlowStatement = {
    query: string;
    calls: number;
    totalExecTimeMs: number;
    meanExecTimeMs: number;
    rows: number;
};

type PgStatStatementsRow = {
    query: string;
    calls: number;
    total_exec_time: number;
    mean_exec_time: number;
    rows: number;
};

const LIMIT_MAX = 100;

/**
 * Top statements by total execution time from `pg_stat_statements`.
 * Throws when the extension/table is missing — callers decide soft vs hard fail.
 */
export async function databaseSlowStatementsFindMany(db: Database, limit: number): Promise<DatabaseSlowStatement[]> {
    const capped = Math.min(Math.max(1, limit), LIMIT_MAX);
    const result = await db.execute<PgStatStatementsRow>(sql`
        SELECT
            query,
            calls::int AS calls,
            total_exec_time,
            mean_exec_time,
            rows::int AS rows
        FROM pg_stat_statements
        ORDER BY total_exec_time DESC
        LIMIT ${capped}
    `);

    const rows = Array.isArray(result) ? result : ((result as { rows?: PgStatStatementsRow[] }).rows ?? []);
    return rows.map((row) => ({
        query: row.query,
        calls: Number(row.calls),
        totalExecTimeMs: Number(row.total_exec_time),
        meanExecTimeMs: Number(row.mean_exec_time),
        rows: Number(row.rows),
    }));
}

export function databaseSlowStatementsUnavailable(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /pg_stat_statements|undefined_table|does not exist/i.test(message);
}
