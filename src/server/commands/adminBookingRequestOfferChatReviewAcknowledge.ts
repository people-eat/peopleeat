import { and, asc, eq, gt, ne, sql } from 'drizzle-orm';

import { bookingRequestOffers } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminBookingRequestOfferChatReviewAcknowledgeResult,
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferChatReviewAcknowledgeArgs,
    GqlSSession,
} from '../graphql/generated';

export async function adminBookingRequestOfferChatReviewAcknowledge(
    _parent: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestOfferChatReviewAcknowledgeArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminBookingRequestOfferChatReviewAcknowledgeResult> {
    const { bookingRequestOfferId } = args;

    try {
        const [offer] = await serverRuntime.db
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
            .limit(1);

        if (!offer) {
            throw new Error('adminBookingRequestOfferChatReviewAcknowledge: offer not found');
        }

        if (offer.adminChatReviewPendingCount > 0) {
            await serverRuntime.db
                .update(bookingRequestOffers)
                .set({
                    adminChatReviewPendingCount: 0,
                    adminChatReviewedAt: new Date(),
                })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await serverRuntime.publish.adminUpdates();
        }

        const [next] = await serverRuntime.db
            .select({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId })
            .from(bookingRequestOffers)
            .where(
                and(
                    gt(bookingRequestOffers.adminChatReviewPendingCount, 0),
                    ne(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId),
                ),
            )
            .orderBy(sql`${bookingRequestOffers.adminChatReviewedAt} ASC NULLS FIRST`, asc(bookingRequestOffers.createdAt))
            .limit(1);

        return {
            acknowledgedOfferId: bookingRequestOfferId,
            nextOfferId: next?.bookingRequestOfferId ?? null,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
