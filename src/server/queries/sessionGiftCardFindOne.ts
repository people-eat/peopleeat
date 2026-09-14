import { desc, eq } from 'drizzle-orm';

import { giftCards } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSGiftCard, GqlSSession } from '../graphql/generated';
import { toGqlGiftCard } from '../mappers/toGqlGiftCard';

/** Latest gift card for the session (any payment status). */
export async function sessionGiftCardFindOne(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSGiftCard | null> {
    const [row] = await serverRuntime.db
        .select()
        .from(giftCards)
        .where(eq(giftCards.sessionId, requestingSession.sessionId))
        .orderBy(desc(giftCards.createdAt))
        .limit(1);

    return row ? toGqlGiftCard(row) : null;
}
