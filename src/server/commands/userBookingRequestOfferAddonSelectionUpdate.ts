import { and, eq, inArray } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cookOfferAddons } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestOfferAddonSelectionUpdateArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferAddonReprice } from '../utils/bookingRequestOfferAddonReprice';
import { bookingRequestOfferNegotiationAssert } from '../utils/bookingRequestOfferNegotiationAssert';
import { bookingRequestOfferPriceSnapshot } from '../utils/bookingRequestOfferPriceSnapshot';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

export async function userBookingRequestOfferAddonSelectionUpdate(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestOfferAddonSelectionUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, requestingSession, serverRuntime);

    if (!(await featureToggleIsEnabled('BOOKING_REQUEST_OFFER_ADDONS', serverRuntime, userId))) {
        throw new Error('userBookingRequestOfferAddonSelectionUpdate: feature disabled');
    }

    try {
        const [row] = await serverRuntime.db
            .select({
                offer: bookingRequestOffers,
                bookingRequest: bookingRequests,
            })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(and(eq(bookingRequestOffers.bookingRequestOfferId, args.bookingRequestOfferId), eq(bookingRequests.userId, userId)))
            .limit(1);

        if (!row) {
            throw new Error('userBookingRequestOfferAddonSelectionUpdate: offer not found');
        }

        bookingRequestOfferNegotiationAssert(row.offer);

        if (row.offer.paymentStatus !== 'EMPTY') {
            throw new Error('userBookingRequestOfferAddonSelectionUpdate: offer already paid');
        }

        const selections = args.selections;
        if (selections.length === 0) {
            throw new Error('userBookingRequestOfferAddonSelectionUpdate: selections required');
        }

        const addonIds = selections.map((selection) => selection.cookOfferAddonId);
        const uniqueIds = [...new Set(addonIds)];
        if (uniqueIds.length !== addonIds.length) {
            throw new Error('userBookingRequestOfferAddonSelectionUpdate: duplicate cookOfferAddonId');
        }

        const offerAddons = await serverRuntime.db
            .select()
            .from(cookOfferAddons)
            .where(
                and(
                    eq(cookOfferAddons.bookingRequestOfferId, args.bookingRequestOfferId),
                    inArray(cookOfferAddons.cookOfferAddonId, uniqueIds),
                ),
            );
        if (offerAddons.length !== uniqueIds.length) {
            throw new Error('userBookingRequestOfferAddonSelectionUpdate: one or more addons not on offer');
        }

        const selectedTitlesBefore = offerAddons.filter((addon) => addon.customerSelected).map((addon) => addon.title);
        const priceBefore = bookingRequestOfferPriceSnapshot(row.offer);
        const selectionById = new Map(selections.map((selection) => [selection.cookOfferAddonId, selection.selected]));

        await serverRuntime.db.transaction(async (transaction) => {
            for (const addon of offerAddons) {
                const selected = selectionById.get(addon.cookOfferAddonId);
                if (selected === undefined) {
                    continue;
                }
                if (addon.inclusion === 'REQUIRED' && !selected) {
                    throw new Error('userBookingRequestOfferAddonSelectionUpdate: required addon cannot be unselected');
                }
                await transaction
                    .update(cookOfferAddons)
                    .set({ customerSelected: selected, updatedAt: new Date() })
                    .where(eq(cookOfferAddons.cookOfferAddonId, addon.cookOfferAddonId));
            }

            const reprice = await bookingRequestOfferAddonReprice(transaction, row.offer);
            const selectedTitlesAfter = reprice.addonRows.filter((addon) => addon.customerSelected).map((addon) => addon.title);

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId: args.bookingRequestOfferId,
                type: 'USER_CHANGED_ADDON_SELECTION',
                payload: {
                    priceBefore,
                    priceAfter: bookingRequestOfferPriceSnapshot({
                        ...row.offer,
                        ...reprice.priceAfter,
                    }),
                    selectedTitlesBefore,
                    selectedTitlesAfter,
                },
            });
        });

        await Promise.all([serverRuntime.publish.userUpdates({ userId }), serverRuntime.publish.userUpdates({ userId: row.offer.cookId })]);

        return { success: true, referenceId: args.bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
