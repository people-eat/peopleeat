import { and, eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferPayoutReleaseArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferCookPayoutReadinessResolve } from '../utils/bookingRequestOfferCookPayoutReadinessResolve';
import { bookingRequestOfferPayoutAlreadyDone } from '../utils/bookingRequestOfferPayoutAlreadyDone';
import { bookingRequestOfferPayoutDueAssert } from '../utils/bookingRequestOfferPayoutDueAssert';

/**
 * Admin-gated Stripe bank payout for a due PAYED offer.
 * Sets `TRANSFERRED` + `payoutDateTime`. Idempotent when already paid out.
 */
export async function adminBookingRequestOfferPayoutRelease(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestOfferPayoutReleaseArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const bookingRequestOfferId = args.bookingRequestOfferId.trim();
    if (bookingRequestOfferId.length === 0) {
        throw new Error('adminBookingRequestOfferPayoutRelease: bookingRequestOfferId must not be empty');
    }

    try {
        const [offer] = await serverRuntime.db
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
            .limit(1);

        if (!offer) {
            throw new Error('adminBookingRequestOfferPayoutRelease: offer not found');
        }

        if (bookingRequestOfferPayoutAlreadyDone(offer)) {
            return { success: true, referenceId: bookingRequestOfferId };
        }

        bookingRequestOfferPayoutDueAssert(offer, 'adminBookingRequestOfferPayoutRelease');

        const [cook] = await serverRuntime.db.select().from(cooks).where(eq(cooks.cookId, offer.cookId)).limit(1);
        if (!cook) {
            throw new Error('adminBookingRequestOfferPayoutRelease: cook not found');
        }

        const readiness = await bookingRequestOfferCookPayoutReadinessResolve(cook, serverRuntime.stripe);
        if (!readiness.cookPayoutReady || !cook.stripeAccountId) {
            throw new Error(
                `adminBookingRequestOfferPayoutRelease: cook is not ready for payout (${readiness.cookPayoutBlockedReason ?? 'UNKNOWN'})`,
            );
        }

        await serverRuntime.stripe.payoutCreate({
            destinationAccountId: cook.stripeAccountId,
            amount: offer.payoutCentsCook,
        });

        await serverRuntime.db.transaction(async (transaction) => {
            const [updated] = await transaction
                .update(bookingRequestOffers)
                .set({
                    paymentStatus: 'TRANSFERRED',
                    payoutDateTime: new Date(),
                })
                .where(
                    and(
                        eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId),
                        eq(bookingRequestOffers.paymentStatus, 'PAYED'),
                    ),
                )
                .returning({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId });

            if (updated) {
                await transaction.insert(bookingRequestOfferEvents).values({
                    bookingRequestOfferEventId: idCreate(),
                    bookingRequestOfferId,
                    type: 'ADMIN_PAYOUT_RELEASED',
                    payload: { amountCents: offer.payoutCentsCook, source: 'RELEASE' },
                });
            }
        });

        await Promise.all([serverRuntime.publish.userUpdates({ userId: offer.cookId }), serverRuntime.publish.adminUpdates()]);

        const { slackNotifyPayoutReleased } = await import('../slack/slackNotifyBooking');
        await slackNotifyPayoutReleased(serverRuntime, {
            bookingRequestId: offer.bookingRequestId,
            bookingRequestOfferId,
            amountCents: offer.payoutCentsCook,
        });

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
