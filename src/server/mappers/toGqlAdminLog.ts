import type { Log } from '../db/schema';
import type { GqlSAdminLog, GqlSAdminLogLevel } from '../graphql/generated';

const ADMIN_LOG_LEVELS = new Set<string>(['error', 'warn', 'info', 'debug']);

function toAdminLogLevel(level: string): GqlSAdminLogLevel {
    if (!ADMIN_LOG_LEVELS.has(level)) {
        throw new Error(`toGqlAdminLog: unexpected level ${level}`);
    }
    return level as GqlSAdminLogLevel;
}

export function toGqlAdminLog(log: Log): GqlSAdminLog {
    return {
        logId: log.logId,
        sessionId: log.sessionId,
        level: toAdminLogLevel(log.level),
        message: log.message,
        context: log.context ?? null,
        createdAt: log.createdAt,
    };
}
