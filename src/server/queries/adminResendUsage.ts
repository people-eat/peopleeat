import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminResendUsage, GqlSSession } from '../graphql/generated';

/**
 * Live Resend email quota for admin overview. Returns null when email transport
 * is console (no API key) or the usage API call fails.
 */
export async function adminResendUsage(
    _args: Record<string, never>,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminResendUsage | null> {
    try {
        return await serverRuntime.email.usageGet();
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        return null;
    }
}
