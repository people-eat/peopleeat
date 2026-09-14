import { eq } from 'drizzle-orm';

import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSUser, GqlSUserLegalAcceptance } from '../graphql/generated';
import { userLegalAcceptanceCompute } from '../utils/userLegalAcceptanceCompute';

export async function userLegalAcceptanceFindOne(
    parentUser: GqlSUser,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSUserLegalAcceptance | null> {
    if (!requestingSession.userId || requestingSession.userId !== parentUser.userId) {
        return null;
    }
    const [user] = await serverRuntime.db
        .select({
            lastAcceptedPrivacyPolicy: users.lastAcceptedPrivacyPolicy,
            lastAcceptedTerms: users.lastAcceptedTerms,
        })
        .from(users)
        .where(eq(users.userId, parentUser.userId))
        .limit(1);
    if (!user) return null;
    return userLegalAcceptanceCompute(user, serverRuntime);
}
