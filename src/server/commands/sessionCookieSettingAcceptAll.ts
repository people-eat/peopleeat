import type { CookieSettingCreate } from '../db/schema';
import { cookieSettings } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function sessionCookieSettingAcceptAll(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    // Phase 1 — Payload construction
    const cookieSettingInsert: CookieSettingCreate = {
        sessionId: requestingSession.sessionId,
        googleAnalytics: true,
        clarity: true,
    };

    // Phase 2 — Execution (upsert so footer re-edit can flip mandatory → all)
    try {
        await serverRuntime.db
            .insert(cookieSettings)
            .values(cookieSettingInsert)
            .onConflictDoUpdate({
                target: cookieSettings.sessionId,
                set: {
                    googleAnalytics: true,
                    clarity: true,
                },
            });

        await serverRuntime.publish.sessionUpdates({ sessionId: requestingSession.sessionId });

        return { success: true, referenceId: requestingSession.sessionId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
