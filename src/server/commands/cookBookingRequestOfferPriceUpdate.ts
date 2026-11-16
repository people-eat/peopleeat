import { and, eq } from 'drizzle-orm';

import { bookingRequestOfferPriceCalculate } from '../../shared/bookingRequestOfferPrice';
import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, promoCodes, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferPriceUpdateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyOfferPriceUpdated } from '../slack/slackNotifyBooking';
import { bookingRequestOfferHardMinimumAssert } from '../utils/bookingRequestOfferHardMinimumAssert';
import { bookingRequestOfferNegotiationAssert } from '../utils/bookingRequestOfferNegotiationAssert';
import { bookingRequestOfferPriceSnapshot } from '../utils/bookingRequestOfferPriceSnapshot';
import { bookingRequestReactionReminderSchedule } from '../utils/bookingRequestReactionReminderSchedule';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';

export async function cookBookingRequestOfferPriceUpdate(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestOfferPriceUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, requestingSession, serverRuntime);
    await userActiveStatusAssert(cookId, serverRuntime, 'cookBookingRequestOfferPriceUpdate');

    const { bookingRequestOfferId, menuPriceCents } = args.input;

    try {
        if (!Number.isInteger(menuPriceCents) || menuPriceCents <= 0) {
            throw new Error('cookBookingRequestOfferPriceUpdate: menuPriceCents must be a positive integer');
        }

        const [row] = await serverRuntime.db
            .select({ offer: bookingRequestOffers, bookingRequest: bookingRequests })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(and(eq(bookingRequestOffers.cookId, cookId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
            .limit(1);

        if (!row) {
            throw new Error('cookBookingRequestOfferPriceUpdate: offer not found');
        }

        bookingRequestOfferNegotiationAssert(row.offer);

        // Travel is locked at offer create (or venue-edit auto-adjust). Menu
        // price edits must not re-apply the cook's live travel rate or distance.
        const price = bookingRequestOfferPriceCalculate({
            menuPriceCents,
            travelExpensesCents: row.offer.travelExpensesCents,
            addonPriceCents: row.offer.addonPriceCents,
            platformFeePercentCook: row.offer.platformFeePercentCook,
            platformFeePercentCustomer: row.offer.platformFeePercentCustomer,
        });

        let promoMinimumTotalAmountCustomerCents: number | null = null;
        if (row.bookingRequest.promoCodeId != null) {
            const [promo] = await serverRuntime.db
                .select({ minimumTotalAmountCustomerCents: promoCodes.minimumTotalAmountCustomerCents })
                .from(promoCodes)
                .where(eq(promoCodes.promoCodeId, row.bookingRequest.promoCodeId))
                .limit(1);
            promoMinimumTotalAmountCustomerCents = promo?.minimumTotalAmountCustomerCents ?? null;
        }
        bookingRequestOfferHardMinimumAssert(price, promoMinimumTotalAmountCustomerCents, 'cookBookingRequestOfferPriceUpdate');

        const priceBefore = bookingRequestOfferPriceSnapshot(row.offer);

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(bookingRequestOffers)
                .set({
                    userUnreadNotificationCount: row.offer.userUnreadNotificationCount + 1,
                    platformFeePercentCook: price.platformFeePercentCook,
                    platformFeePercentCustomer: price.platformFeePercentCustomer,
                    menuPriceCents: price.menuPriceCents,
                    addonPriceCents: price.addonPriceCents,
                    paymentProviderFeeCents: price.paymentProviderFeeCents,
                    platformFeeCentsCook: price.platformFeeCentsCook,
                    platformFeeCentsCustomer: price.platformFeeCentsCustomer,
                    payoutCentsCook: price.payoutCentsCook,
                    totalWithoutDiscountsCentsCustomer: price.totalWithoutDiscountsCentsCustomer,
                    priceAutoAdjustReason: null,
                })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId,
                type: 'COOK_CHANGED_PRICE',
                payload: {
                    priceBefore,
                    priceAfter: bookingRequestOfferPriceSnapshot(price),
                },
            });
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: cookId }),
            serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        const [cookUser] = await serverRuntime.db
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.userId, cookId))
            .limit(1);

        await slackNotifyOfferPriceUpdated(serverRuntime, {
            bookingRequestId: row.bookingRequest.bookingRequestId,
            bookingRequestOfferId,
            cookName: cookUser ? `${cookUser.firstName} ${cookUser.lastName}` : cookId,
            beforeCents: priceBefore.totalWithoutDiscountsCentsCustomer,
            afterCents: price.totalWithoutDiscountsCentsCustomer,
        });

        await bookingRequestReactionReminderSchedule(serverRuntime, {
            bookingRequestId: row.bookingRequest.bookingRequestId,
        });

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
