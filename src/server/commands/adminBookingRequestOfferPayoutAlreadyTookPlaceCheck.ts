import { and, eq } from 'drizzle-orm';

import { bookingRequestOffers, cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferPayoutAlreadyTookPlaceCheckArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferPayoutAlreadyDone } from '../utils/bookingRequestOfferPayoutAlreadyDone';
import { bookingRequestOfferPayoutDueAssert } from '../utils/bookingRequestOfferPayoutDueAssert';

function isMatchingManualPayoutStatus(status: string): boolean {
    return status === 'PAID' || status === 'PENDING' || status === 'IN_TRANSIT';
}

/**
 * Checks Stripe for a matching Connect bank payout on a due PAYED offer. When
 * found, sets `TRANSFERRED` + `payoutDateTime` without calling `payoutCreate`.
 * When none matches, returns `{ success: false }` and leaves the offer unchanged.
 * Idempotent when already paid out.
 */
export async function adminBookingRequestOfferPayoutAlreadyTookPlaceCheck(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestOfferPayoutAlreadyTookPlaceCheckArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const bookingRequestOfferId = args.bookingRequestOfferId.trim();
    if (bookingRequestOfferId.length === 0) {
        throw new Error('adminBookingRequestOfferPayoutAlreadyTookPlaceCheck: bookingRequestOfferId must not be empty');
    }

    try {
        const [offer] = await serverRuntime.db
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
            .limit(1);

        if (!offer) {
            throw new Error('adminBookingRequestOfferPayoutAlreadyTookPlaceCheck: offer not found');
        }

        if (bookingRequestOfferPayoutAlreadyDone(offer)) {
            return { success: true, referenceId: bookingRequestOfferId };
        }

        bookingRequestOfferPayoutDueAssert(offer, 'adminBookingRequestOfferPayoutAlreadyTookPlaceCheck');

        const [cook] = await serverRuntime.db.select().from(cooks).where(eq(cooks.cookId, offer.cookId)).limit(1);
        if (!cook) {
            throw new Error('adminBookingRequestOfferPayoutAlreadyTookPlaceCheck: cook not found');
        }
        if (!cook.stripeAccountId) {
            throw new Error('adminBookingRequestOfferPayoutAlreadyTookPlaceCheck: cook has no Stripe account');
        }

        const payouts = await serverRuntime.stripe.accountPayoutsFindMany({
            accountId: cook.stripeAccountId,
            limit: 100,
        });
        const matching = payouts.find(
            (payout) => payout.amountCents === offer.payoutCentsCook && isMatchingManualPayoutStatus(payout.status),
        );

        if (!matching) {
            serverRuntime.log.warn(
                `adminBookingRequestOfferPayoutAlreadyTookPlaceCheck: no matching Stripe payout for offer ${bookingRequestOfferId} (expected ${offer.payoutCentsCook} cents on ${cook.stripeAccountId})`,
                requestingSession,
            );
            return { success: false, referenceId: bookingRequestOfferId };
        }

        serverRuntime.log.info(
            `adminBookingRequestOfferPayoutAlreadyTookPlaceCheck: matched Stripe payout ${matching.id} (${matching.status}, ${matching.amountCents} cents) for offer ${bookingRequestOfferId}`,
            requestingSession,
        );

        await serverRuntime.db
            .update(bookingRequestOffers)
            .set({
                paymentStatus: 'TRANSFERRED',
                payoutDateTime: new Date(),
            })
            .where(
                and(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId), eq(bookingRequestOffers.paymentStatus, 'PAYED')),
            );

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
