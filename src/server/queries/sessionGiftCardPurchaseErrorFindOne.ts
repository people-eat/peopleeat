import { eq } from 'drizzle-orm';

import { sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSGiftCardPurchaseError, GqlSSession } from '../graphql/generated';

export async function sessionGiftCardPurchaseErrorFindOne(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSGiftCardPurchaseError | null> {
    const [row] = await serverRuntime.db
        .select({ giftCardPurchaseError: sessions.giftCardPurchaseError })
        .from(sessions)
        .where(eq(sessions.sessionId, requestingSession.sessionId))
        .limit(1);

    if (!row?.giftCardPurchaseError) {
        return null;
    }
    return { code: row.giftCardPurchaseError };
}
