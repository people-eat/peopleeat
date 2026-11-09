import { and, eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferAddonsUpdateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferAddonReprice } from '../utils/bookingRequestOfferAddonReprice';
import { bookingRequestOfferAddonsSync } from '../utils/bookingRequestOfferAddonsSync';
import { bookingRequestOfferNegotiationAssert } from '../utils/bookingRequestOfferNegotiationAssert';
import { bookingRequestOfferPriceSnapshot } from '../utils/bookingRequestOfferPriceSnapshot';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

export async function cookBookingRequestOfferAddonsUpdate(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestOfferAddonsUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, requestingSession, serverRuntime);

    if (!(await featureToggleIsEnabled('BOOKING_REQUEST_OFFER_ADDONS', serverRuntime, cookId))) {
        throw new Error('cookBookingRequestOfferAddonsUpdate: feature disabled');
    }

    try {
        const [offer] = await serverRuntime.db
            .select()
            .from(bookingRequestOffers)
            .where(
                and(
                    eq(bookingRequestOffers.bookingRequestOfferId, args.input.bookingRequestOfferId),
                    eq(bookingRequestOffers.cookId, cookId),
                ),
            )
            .limit(1);
        if (!offer) {
            throw new Error('cookBookingRequestOfferAddonsUpdate: offer not found');
        }

        const [bookingRequest] = await serverRuntime.db
            .select()
            .from(bookingRequests)
            .where(eq(bookingRequests.bookingRequestId, offer.bookingRequestId))
            .limit(1);
        if (!bookingRequest) {
            throw new Error('cookBookingRequestOfferAddonsUpdate: booking request not found');
        }

        bookingRequestOfferNegotiationAssert(offer);

        const priceBefore = bookingRequestOfferPriceSnapshot(offer);

        await serverRuntime.db.transaction(async (transaction) => {
            const sync = await bookingRequestOfferAddonsSync(transaction, {
                cookId,
                bookingRequestOfferId: offer.bookingRequestOfferId,
                suggestedAddonIds: args.input.suggestedAddonIds,
            });

            const reprice = await bookingRequestOfferAddonReprice(transaction, offer);

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId: offer.bookingRequestOfferId,
                type: 'COOK_CHANGED_ADDONS',
                payload: {
                    priceBefore,
                    priceAfter: bookingRequestOfferPriceSnapshot({
                        ...offer,
                        ...reprice.priceAfter,
                    }),
                    addonTitlesBefore: sync.titlesBefore,
                    addonTitlesAfter: sync.titlesAfter,
                },
            });
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: cookId }),
            serverRuntime.publish.userUpdates({ userId: bookingRequest.userId }),
        ]);

        return { success: true, referenceId: offer.bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
