import { and, eq, not } from 'drizzle-orm';

import { bookingRequestOfferPriceCalculate } from '../../shared/bookingRequestOfferPrice';
import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cooks, giftCards, promoCodes, users } from '../db/schema';
import { cookCanCreateOffersDerive } from '../domain/cook';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestOfferAcceptArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyOfferAccept, slackNotifyPaymentConfirmed } from '../slack/slackNotifyBooking';
import { bookingRequestExpireNotifyCancel } from '../utils/bookingRequestExpireNotifySchedule';
import {
    bookingRequestOfferPaymentConfirmedEmailSend,
    userBookingRequestOfferAcceptEmailSend,
} from '../utils/bookingRequestLifecycleEmails';
import { bookingRequestOfferEventTomorrowNotifySchedule } from '../utils/bookingRequestOfferEventTomorrowNotifySchedule';
import { bookingRequestOfferNegotiationAssert } from '../utils/bookingRequestOfferNegotiationAssert';
import { bookingRequestOfferPaymentPrepare } from '../utils/bookingRequestOfferPaymentPrepare';
import { bookingRequestOfferPaymentSucceededSessionEventCreate } from '../utils/bookingRequestOfferPaymentSessionEventCreate';
import { bookingRequestReactionReminderCancel } from '../utils/bookingRequestReactionReminderSchedule';
import { cookIdsCanCreateOffersFind } from '../utils/cookIdsCanCreateOffersFind';
import { giftCardCharge } from '../utils/giftCardCharge';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { travelDistanceKmResolve } from '../utils/travelDistanceKmResolve';

/**
 * Dual-accept an offer and prepare Stripe payment:
 * €0 gift/promo → immediate cook transfer + PAYED;
 * event &lt;15d (Europe/Berlin) → PaymentIntent;
 * else → SetupIntent (card save; pull jobs after paymentStatusUpdate).
 */
export async function userBookingRequestOfferAccept(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestOfferAcceptArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const { bookingRequestOfferId } = args;

    try {
        const [[row], [customer], [cookUser]] = await Promise.all([
            serverRuntime.db
                .select({
                    offer: bookingRequestOffers,
                    bookingRequest: bookingRequests,
                    cook: cooks,
                    giftCard: giftCards,
                    promoCode: promoCodes,
                })
                .from(bookingRequestOffers)
                .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
                .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
                .leftJoin(giftCards, eq(giftCards.giftCardId, bookingRequests.giftCardId))
                .leftJoin(promoCodes, eq(promoCodes.promoCodeId, bookingRequests.promoCodeId))
                .where(and(eq(bookingRequests.userId, userId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
                .limit(1),
            serverRuntime.db.select().from(users).where(eq(users.userId, userId)).limit(1),
            serverRuntime.db
                .select({ status: users.status })
                .from(bookingRequestOffers)
                .innerJoin(users, eq(users.userId, bookingRequestOffers.cookId))
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
                .limit(1),
        ]);

        if (!row || !customer?.emailAddress) {
            throw new Error('userBookingRequestOfferAccept: offer not found');
        }

        if (customer.status !== 'ACTIVE') {
            throw new Error('userBookingRequestOfferAccept: user is not active');
        }

        bookingRequestOfferNegotiationAssert(row.offer);

        if (row.offer.cookAccepted !== true) {
            throw new Error('userBookingRequestOfferAccept: cook has not accepted');
        }

        if (!cookUser || !cookCanCreateOffersDerive(row.cook, cookUser.status) || !row.cook.stripeAccountId) {
            throw new Error('userBookingRequestOfferAccept: cook cannot receive bookings');
        }

        const origin = row.cook.exactTravelOriginAddress;
        if (!origin) {
            throw new Error('userBookingRequestOfferAccept: cook travel origin is required');
        }

        const eventAddress = row.bookingRequest.exactEventAddress;
        const travelDistanceKm = await travelDistanceKmResolve(
            serverRuntime.places,
            { latitude: origin.latitude, longitude: origin.longitude },
            { latitude: eventAddress.latitude, longitude: eventAddress.longitude },
        );
        const travelExpensesCents = Math.round(travelDistanceKm * row.cook.travelExpensesAmount * 2);
        const price = bookingRequestOfferPriceCalculate({
            menuPriceCents: row.offer.menuPriceCents,
            travelExpensesCents,
        });

        const discountCents = (row.giftCard?.balanceCents ?? 0) + (row.promoCode?.amountCents ?? 0);
        const totalCentsCustomer = Math.max(0, price.totalWithoutDiscountsCentsCustomer - discountCents);
        const giftCardAppliedCents = row.giftCard ? Math.min(row.giftCard.balanceCents, price.totalWithoutDiscountsCentsCustomer) : 0;

        const payment = await bookingRequestOfferPaymentPrepare(serverRuntime, {
            userId,
            emailAddress: customer.emailAddress,
            firstName: customer.firstName,
            lastName: customer.lastName,
            destinationAccountId: row.cook.stripeAccountId,
            totalCentsCustomer,
            payoutCentsCook: price.payoutCentsCook,
            eventDateTime: row.bookingRequest.dateTime,
        });

        const siblingOffers = await serverRuntime.db
            .select({ cookId: bookingRequestOffers.cookId })
            .from(bookingRequestOffers)
            .where(
                and(
                    eq(bookingRequestOffers.bookingRequestId, row.bookingRequest.bookingRequestId),
                    not(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)),
                ),
            );

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(bookingRequestOffers)
                .set({
                    userAccepted: true,
                    travelDistanceKm,
                    travelExpensesCents: price.travelExpensesCents,
                    paymentProviderFeeCents: price.paymentProviderFeeCents,
                    platformFeePercentCook: price.platformFeePercentCook,
                    platformFeePercentCustomer: price.platformFeePercentCustomer,
                    platformFeeCentsCook: price.platformFeeCentsCook,
                    platformFeeCentsCustomer: price.platformFeeCentsCustomer,
                    payoutCentsCook: price.payoutCentsCook,
                    totalWithoutDiscountsCentsCustomer: price.totalWithoutDiscountsCentsCustomer,
                    totalCentsCustomer,
                    giftCardAppliedCents,
                    cookUnreadNotificationCount: row.offer.cookUnreadNotificationCount + 1,
                    paymentStatus: payment.paymentStatus,
                    paymentData: payment.paymentData,
                    plannedPaymentPullDateTime: payment.plannedPaymentPullDateTime,
                    paymentDateTime: payment.paymentDateTime,
                    plannedPayoutDateTime: payment.plannedPayoutDateTime,
                })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await transaction
                .update(bookingRequests)
                .set({ expiresAt: null })
                .where(eq(bookingRequests.bookingRequestId, row.bookingRequest.bookingRequestId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId,
                type: 'USER_ACCEPTED',
                payload: {},
            });
        });

        await bookingRequestExpireNotifyCancel(serverRuntime, row.bookingRequest.bookingRequestId);

        if (row.giftCard) {
            await giftCardCharge(serverRuntime, row.giftCard, price.totalWithoutDiscountsCentsCustomer);
        }

        const cookIdsCanCreateOffers = await cookIdsCanCreateOffersFind(
            serverRuntime,
            { latitude: eventAddress.latitude, longitude: eventAddress.longitude },
            { excludeUserId: userId },
        );

        const publishUserIds = new Set<string>([
            userId,
            row.offer.cookId,
            ...siblingOffers.map((sibling) => sibling.cookId),
            ...cookIdsCanCreateOffers,
        ]);

        await Promise.all([
            ...[...publishUserIds].map((id) => serverRuntime.publish.userUpdates({ userId: id })),
            serverRuntime.publish.adminUpdates(),
        ]);

        await userBookingRequestOfferAcceptEmailSend(serverRuntime, {
            bookingRequestOfferId,
            bookingRequestId: row.bookingRequest.bookingRequestId,
            customerUserId: userId,
            cookId: row.offer.cookId,
            siblingCookIds: siblingOffers.map((sibling) => sibling.cookId),
        });

        if (payment.paymentStatus === 'PAYED') {
            await bookingRequestOfferPaymentConfirmedEmailSend(serverRuntime, {
                offer: row.offer,
                bookingRequest: row.bookingRequest,
            });
            await slackNotifyPaymentConfirmed(serverRuntime, {
                bookingRequestId: row.bookingRequest.bookingRequestId,
                bookingRequestOfferId,
                amountCents: price.totalWithoutDiscountsCentsCustomer,
            });
            await bookingRequestOfferEventTomorrowNotifySchedule(serverRuntime, {
                bookingRequestId: row.bookingRequest.bookingRequestId,
                bookingRequestOfferId,
                eventDate: row.bookingRequest.dateTime,
            });
        }

        await slackNotifyOfferAccept(serverRuntime, {
            bookingRequestId: row.bookingRequest.bookingRequestId,
            bookingRequestOfferId,
            actor: 'customer',
            name: `${customer.firstName} ${customer.lastName}`,
            dualAccepted: true,
        });

        await bookingRequestReactionReminderCancel(serverRuntime, row.bookingRequest.bookingRequestId);

        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'BOOKING_REQUEST_OFFER_ACCEPTED',
            payload: {
                bookingRequestId: row.bookingRequest.bookingRequestId,
                bookingRequestOfferId,
                actor: 'customer',
            },
        });

        if (payment.paymentStatus === 'PAYED') {
            await bookingRequestOfferPaymentSucceededSessionEventCreate(serverRuntime, {
                sessionId: requestingSession.sessionId,
                customerUserId: userId,
                bookingRequestId: row.bookingRequest.bookingRequestId,
                bookingRequestOfferId,
            });
        }

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
