import type { ServerRuntime } from '../domain/ServerRuntime';
import { userLegalAcceptanceRequired } from '../utils/userLegalAcceptanceRequired';

// Throws when the signed-in user must accept the latest published privacy /
// terms before continuing. Called from UserMutation / CookMutation /
// AdminMutation commands (not from resolvers). Skipped by `userLegalAccept`
// and `terminateSessions`.
export async function assertLegalAcceptanceCurrent(userId: string, serverRuntime: ServerRuntime): Promise<void> {
    const required = await userLegalAcceptanceRequired(userId, serverRuntime);
    if (required) {
        throw new Error('Unauthorized');
    }
}
