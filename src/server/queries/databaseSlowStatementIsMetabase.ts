/**
 * Heuristic for Metabase SQL in `pg_stat_statements`.
 * Used to keep Slack ops alerts focused on app queries for now.
 *
 * Covers GUI cards (`__mb_`, JSON `#>>`, `"Table - Column"`) and native questions
 * (`public."Table"` / `"public"."Table"`, quoted aliases with spaces).
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
    // Native questions qualify the public schema; Drizzle app SQL does not.
    if (/\bpublic\s*\.\s*"/.test(normalized) || /"public"\s*\./.test(normalized)) {
        return true;
    }
    // Native column aliases: "Visit day", "Unique visitors", "Landing path", …
    for (const match of query.matchAll(/"([^"]*)"/g)) {
        if (match[1]?.includes(' ')) {
            return true;
        }
    }
    return false;
}
