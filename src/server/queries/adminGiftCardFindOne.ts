import { eq } from 'drizzle-orm';

import { giftCards } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminGiftCard, GqlSAdminGiftCardArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminGiftCard } from '../mappers/toGqlAdminGiftCard';

export async function adminGiftCardFindOne(
    args: GqlSAdminGiftCardArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminGiftCard | null> {
    try {
        const [row] = await serverRuntime.db.select().from(giftCards).where(eq(giftCards.giftCardId, args.giftCardId)).limit(1);
        if (!row) {
            return null;
        }
        return toGqlAdminGiftCard(row);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
