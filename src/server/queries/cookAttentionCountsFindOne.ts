import { eq, sum } from 'drizzle-orm';

import { bookingRequestOffers, cooks } from '../db/schema';
import { cookWalletNeedsAttentionDerive } from '../domain/cook';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookAttentionCounts, GqlSSession } from '../graphql/generated';
import { cookBookingRequestPoolRowsFind } from '../utils/cookBookingRequestPoolRowsFind';

export async function cookAttentionCountsFindOne(
    { cookId }: GqlSCook,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookAttentionCounts> {
    try {
        const [cook] = await serverRuntime.db.select().from(cooks).where(eq(cooks.cookId, cookId)).limit(1);
        if (!cook) {
            return { bookingRequestPoolCount: 0, bookingRequestOfferUnreadCount: 0, walletNeedsAttention: false };
        }

        const [poolRows, [unreadRow]] = await Promise.all([
            cookBookingRequestPoolRowsFind(cook, { onlyDeclined: false }, serverRuntime),
            serverRuntime.db
                .select({ value: sum(bookingRequestOffers.cookUnreadNotificationCount) })
                .from(bookingRequestOffers)
                .where(eq(bookingRequestOffers.cookId, cookId)),
        ]);

        return {
            bookingRequestPoolCount: poolRows.length,
            bookingRequestOfferUnreadCount: Number(unreadRow?.value ?? 0),
            walletNeedsAttention: cookWalletNeedsAttentionDerive(cook),
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
