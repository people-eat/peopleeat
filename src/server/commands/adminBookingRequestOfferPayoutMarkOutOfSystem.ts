import { and, eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferPayoutMarkOutOfSystemArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferPayoutAlreadyDone } from '../utils/bookingRequestOfferPayoutAlreadyDone';
import { bookingRequestOfferPayoutDueAssert } from '../utils/bookingRequestOfferPayoutDueAssert';

/**
 * Marks a due PAYED offer as paid outside Stripe. Sets `PAYED_OUT_OF_SYSTEM` +
 * `payoutDateTime`. Idempotent when already paid out.
 */
export async function adminBookingRequestOfferPayoutMarkOutOfSystem(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestOfferPayoutMarkOutOfSystemArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const bookingRequestOfferId = args.bookingRequestOfferId.trim();
    if (bookingRequestOfferId.length === 0) {
        throw new Error('adminBookingRequestOfferPayoutMarkOutOfSystem: bookingRequestOfferId must not be empty');
    }

    try {
        const [offer] = await serverRuntime.db
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
            .limit(1);

        if (!offer) {
            throw new Error('adminBookingRequestOfferPayoutMarkOutOfSystem: offer not found');
        }

        if (bookingRequestOfferPayoutAlreadyDone(offer)) {
            return { success: true, referenceId: bookingRequestOfferId };
        }

        bookingRequestOfferPayoutDueAssert(offer, 'adminBookingRequestOfferPayoutMarkOutOfSystem');

        await serverRuntime.db.transaction(async (transaction) => {
            const [updated] = await transaction
                .update(bookingRequestOffers)
                .set({
                    paymentStatus: 'PAYED_OUT_OF_SYSTEM',
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
                    type: 'ADMIN_PAYED_OUT_OF_SYSTEM',
                    payload: { amountCents: offer.payoutCentsCook, source: 'MARK_OUT_OF_SYSTEM' },
                });
            }
        });

        await Promise.all([serverRuntime.publish.userUpdates({ userId: offer.cookId }), serverRuntime.publish.adminUpdates()]);

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
