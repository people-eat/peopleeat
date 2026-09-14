import { desc, eq } from 'drizzle-orm';

import { giftCards } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSUser, GqlSUserGiftCard } from '../graphql/generated';
import { toGqlUserGiftCard } from '../mappers/toGqlUserGiftCard';

export async function userGiftCardFindMany(
    parentUser: GqlSUser,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSUserGiftCard[] | null> {
    if (!requestingSession.userId || requestingSession.userId !== parentUser.userId) {
        return null;
    }

    try {
        const rows = await serverRuntime.db
            .select()
            .from(giftCards)
            .where(eq(giftCards.buyerUserId, parentUser.userId))
            .orderBy(desc(giftCards.createdAt));

        return rows.map(toGqlUserGiftCard);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
