import type { CookieSettingCreate } from '../db/schema';
import { cookieSettings } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function sessionCookieSettingAcceptMandatory(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    // Phase 1 — Payload construction
    const cookieSettingInsert: CookieSettingCreate = {
        sessionId: requestingSession.sessionId,
        googleAnalytics: false,
        clarity: false,
    };

    // Phase 2 — Execution (upsert so footer re-edit can flip all → mandatory)
    try {
        await serverRuntime.db
            .insert(cookieSettings)
            .values(cookieSettingInsert)
            .onConflictDoUpdate({
                target: cookieSettings.sessionId,
                set: {
                    googleAnalytics: false,
                    clarity: false,
                },
            });

        await serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId });

        return { success: true, referenceId: requestingSession.sessionId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
