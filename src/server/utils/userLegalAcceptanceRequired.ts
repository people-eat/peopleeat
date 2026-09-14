import { eq } from 'drizzle-orm';

import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { userLegalAcceptanceCompute } from './userLegalAcceptanceCompute';

export async function userLegalAcceptanceRequired(userId: string, serverRuntime: ServerRuntime): Promise<boolean> {
    const [user] = await serverRuntime.db
        .select({
            lastAcceptedPrivacyPolicy: users.lastAcceptedPrivacyPolicy,
            lastAcceptedTerms: users.lastAcceptedTerms,
        })
        .from(users)
        .where(eq(users.userId, userId))
        .limit(1);
    if (!user) {
        throw new Error('Unauthorized');
    }
    const acceptance = await userLegalAcceptanceCompute(user, serverRuntime);
    return acceptance.required;
}
