import { desc, eq } from 'drizzle-orm';

import { bookingRequestOffers, cooks } from '../db/schema';
import { cookStripeStatusDerive } from '../domain/cook';
import { cookAttentionDerive } from '../domain/cookAttention';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookAttentionItem, GqlSSession } from '../graphql/generated';
import { cookCallSlotBookingsFindMany } from './cookCallSlotBookingsFindMany';

const UPCOMING_CALL_WINDOW_DAYS = 14;

export async function cookAttentionFindMany(
    parent: GqlSCook,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookAttentionItem[]> {
    try {
        const from = new Date();
        const to = new Date(from);
        to.setDate(to.getDate() + UPCOMING_CALL_WINDOW_DAYS);

        const [[cook], offers, upcomingCalls] = await Promise.all([
            serverRuntime.db.select().from(cooks).where(eq(cooks.cookId, parent.cookId)).limit(1),
            serverRuntime.db
                .select({
                    bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId,
                    cookUnreadNotificationCount: bookingRequestOffers.cookUnreadNotificationCount,
                })
                .from(bookingRequestOffers)
                .where(eq(bookingRequestOffers.cookId, parent.cookId))
                .orderBy(desc(bookingRequestOffers.createdAt)),
            cookCallSlotBookingsFindMany(parent, { criterion: { from, to } }, requestingSession, serverRuntime),
        ]);
        if (!cook) {
            return [];
        }

        const nextCall = upcomingCalls[0];
        return cookAttentionDerive({
            isApprovedByAdmin: cook.isApprovedByAdmin,
            stripeStatus: cookStripeStatusDerive(cook),
            offers,
            nextCall: nextCall
                ? {
                      bookingRequestOfferId: nextCall.bookingRequestOfferId,
                      startAt: nextCall.startAt,
                      customerDisplay: nextCall.customer.display,
                  }
                : null,
        });
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
