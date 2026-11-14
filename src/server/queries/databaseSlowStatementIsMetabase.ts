/**
 * Heuristic for Metabase-generated SQL in `pg_stat_statements`.
 * Used to keep Slack ops alerts focused on app queries for now.
 */
export function databaseSlowStatementIsMetabase(query: string): boolean {
    const normalized = query.toLowerCase();
    if (normalized.includes('__mb_')) {
        return true;
    }
    // Metabase JSON field extraction (`#>> array['path', …]`).
    if (normalized.includes('#>> array[')) {
        return true;
    }
    // Metabase FK join aliases: "Sessions - SessionId", "Users - UserId", …
    if (/"[A-Za-z0-9_]+ - [A-Za-z0-9_]+"/.test(query)) {
        return true;
    }
    return false;
}
