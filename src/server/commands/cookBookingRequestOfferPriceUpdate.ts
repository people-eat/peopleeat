import { and, eq } from 'drizzle-orm';

import { bookingRequestOfferPriceCalculate } from '../../shared/bookingRequestOfferPrice';
import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cooks, promoCodes, users } from '../db/schema';
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
import { travelDistanceKmResolve } from '../utils/travelDistanceKmResolve';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';

export async function cookBookingRequestOfferPriceUpdate(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestOfferPriceUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);
    await userActiveStatusAssert(cookId, serverRuntime, 'cookBookingRequestOfferPriceUpdate');

    const { bookingRequestOfferId, menuPriceCents } = args.input;

    try {
        if (!Number.isInteger(menuPriceCents) || menuPriceCents <= 0) {
            throw new Error('cookBookingRequestOfferPriceUpdate: menuPriceCents must be a positive integer');
        }

        const [row] = await serverRuntime.db
            .select({ offer: bookingRequestOffers, bookingRequest: bookingRequests, cook: cooks })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
            .where(and(eq(bookingRequestOffers.cookId, cookId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
            .limit(1);

        if (!row) {
            throw new Error('cookBookingRequestOfferPriceUpdate: offer not found');
        }

        bookingRequestOfferNegotiationAssert(row.offer);

        const origin = row.cook.exactTravelOriginAddress;
        if (!origin) {
            throw new Error('cookBookingRequestOfferPriceUpdate: cook travel origin is required');
        }

        const travelDistanceKm =
            row.offer.travelDistanceKm ??
            (await travelDistanceKmResolve(
                serverRuntime.places,
                { latitude: origin.latitude, longitude: origin.longitude },
                {
                    latitude: row.bookingRequest.exactEventAddress.latitude,
                    longitude: row.bookingRequest.exactEventAddress.longitude,
                },
            ));
        const travelExpensesCents = Math.round(travelDistanceKm * row.cook.travelExpensesAmount * 2);
        const price = bookingRequestOfferPriceCalculate({ menuPriceCents, travelExpensesCents });

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
                    travelDistanceKm,
                    platformFeePercentCook: price.platformFeePercentCook,
                    platformFeePercentCustomer: price.platformFeePercentCustomer,
                    travelExpensesCents: price.travelExpensesCents,
                    menuPriceCents: price.menuPriceCents,
                    paymentProviderFeeCents: price.paymentProviderFeeCents,
                    platformFeeCentsCook: price.platformFeeCentsCook,
                    platformFeeCentsCustomer: price.platformFeeCentsCustomer,
                    payoutCentsCook: price.payoutCentsCook,
                    totalWithoutDiscountsCentsCustomer: price.totalWithoutDiscountsCentsCustomer,
                    isPriceAutoAdjusted: false,
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
