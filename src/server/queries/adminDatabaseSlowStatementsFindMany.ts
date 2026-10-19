import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminDatabaseSlowStatement, GqlSAdminDatabaseSlowStatementsArgs, GqlSSession } from '../graphql/generated';
import { databaseSlowStatementsFindMany, databaseSlowStatementsUnavailable } from './databaseSlowStatementsFindMany';

/**
 * Top statements by total execution time. Returns [] when `pg_stat_statements`
 * is missing (extension not installed / not in shared_preload_libraries).
 */
export async function adminDatabaseSlowStatementsFindMany(
    args: GqlSAdminDatabaseSlowStatementsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminDatabaseSlowStatement[]> {
    try {
        return await databaseSlowStatementsFindMany(serverRuntime.db, args.limit ?? 20);
    } catch (error) {
        if (databaseSlowStatementsUnavailable(error)) {
            const message = error instanceof Error ? error.message : String(error);
            serverRuntime.log.warn(`adminDatabaseSlowStatementsFindMany: pg_stat_statements unavailable (${message})`, requestingSession);
            return [];
        }
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
