import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { userLegalAcceptanceRequired } from '../utils/userLegalAcceptanceRequired';

// Throws when the signed-in user must accept the latest published privacy /
// terms before continuing. Called from UserMutation / CookMutation /
// AdminMutation commands (not from resolvers). Skipped by `userLegalAccept`
// and `terminateSessions`. Admin Sign in as skips the gate so operators are
// not forced to accept on the target user's behalf.
export async function assertLegalAcceptanceCurrent(
    userId: string,
    requestingSession: Pick<GqlSSession, 'impersonationReturnSessionId'>,
    serverRuntime: ServerRuntime,
): Promise<void> {
    if (requestingSession.impersonationReturnSessionId) {
        return;
    }
    const required = await userLegalAcceptanceRequired(userId, serverRuntime);
    if (required) {
        throw new Error('Unauthorized');
    }
}
