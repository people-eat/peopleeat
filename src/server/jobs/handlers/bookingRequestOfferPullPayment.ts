import { eq } from 'drizzle-orm';

import { idCreate } from '../../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cooks, users } from '../../db/schema';
import type { BookingRequestOfferPaymentData } from '../../domain/bookingRequest';
import { bookingRequestOfferExtraTransferMaybeCreate } from '../../utils/bookingRequestOfferExtraTransferMaybeCreate';
import { paymentDataWithExtraTransfer } from '../../utils/bookingRequestOfferPaymentDataTransfers';
import {
    bookingRequestOfferPaymentFailedSessionEventCreate,
    bookingRequestOfferPaymentSucceededSessionEventCreate,
} from '../../utils/bookingRequestOfferPaymentSessionEventCreate';
import type { QueuedJobDefinition } from '../types';

interface BookingRequestOfferPullPaymentData {
    bookingRequestOfferId: string;
}

/**
 * Off-session charge from a saved SetupIntent card, ~14 days before the event.
 * Enqueued from `bookingRequestOfferPaymentFinalize` when status becomes SETUP.
 */
export const bookingRequestOfferPullPayment: QueuedJobDefinition<BookingRequestOfferPullPaymentData> = {
    kind: 'queued',
    name: 'booking-request-offer-pull-payment',
    handler: async ({ data, serverRuntime }) => {
        const [row] = await serverRuntime.db
            .select({
                offer: bookingRequestOffers,
                bookingRequest: bookingRequests,
                cook: cooks,
                customer: users,
            })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
            .innerJoin(users, eq(users.userId, bookingRequests.userId))
            .where(eq(bookingRequestOffers.bookingRequestOfferId, data.bookingRequestOfferId))
            .limit(1);

        if (!row) {
            throw new Error(`bookingRequestOfferPullPayment: offer ${data.bookingRequestOfferId} not found`);
        }

        const { offer, cook, customer, bookingRequest } = row;

        if (offer.paymentStatus === 'PAYED' || offer.paymentStatus === 'PAYED_OUT_OF_SYSTEM' || offer.paymentStatus === 'TRANSFERRED') {
            return;
        }

        if (!offer.paymentData || !('setupIntentId' in offer.paymentData) || !offer.paymentData.setupIntentId) {
            throw new Error(`bookingRequestOfferPullPayment: missing setupIntentId for ${data.bookingRequestOfferId}`);
        }

        if (!cook.stripeAccountId || !cook.stripeAccountActive) {
            throw new Error(`bookingRequestOfferPullPayment: cook ${cook.cookId} has no active Stripe account`);
        }

        if (!customer.emailAddress) {
            throw new Error(`bookingRequestOfferPullPayment: customer ${customer.userId} has no email`);
        }

        const totalCentsCustomer = offer.totalCentsCustomer ?? 0;
        const setupIntentId = offer.paymentData.setupIntentId;
        const existingClientSecret = 'clientSecret' in offer.paymentData ? offer.paymentData.clientSecret : '';

        try {
            if (totalCentsCustomer > 0) {
                const paymentMethodId = await serverRuntime.stripe.setupIntentPaymentMethodIdFindOne(setupIntentId);
                if (!paymentMethodId) {
                    throw new Error(`bookingRequestOfferPullPayment: no payment method on ${setupIntentId}`);
                }

                const { paymentIntentId, clientSecret } = await serverRuntime.stripe.paymentIntentCreateFromPaymentMethodWithSplit({
                    destinationAccountId: cook.stripeAccountId,
                    user: {
                        userId: customer.userId,
                        emailAddress: customer.emailAddress,
                        firstName: customer.firstName,
                        lastName: customer.lastName,
                    },
                    paymentMethodId,
                    pullAmount: totalCentsCustomer,
                    payoutAmount: offer.payoutCentsCook,
                });

                const succeeded = await serverRuntime.stripe.paymentIntentSucceededCheck(paymentIntentId);
                if (!succeeded) {
                    throw new Error(`bookingRequestOfferPullPayment: payment intent ${paymentIntentId} not succeeded`);
                }

                const extraTransferId = await bookingRequestOfferExtraTransferMaybeCreate(serverRuntime, {
                    destinationAccountId: cook.stripeAccountId,
                    userId: customer.userId,
                    totalCentsCustomer,
                    payoutCentsCook: offer.payoutCentsCook,
                    idempotencyKey: `pull-payment:${data.bookingRequestOfferId}:extra-transfer`,
                });

                const transferId = await serverRuntime.stripe.paymentIntentDestinationTransferIdFindOne(paymentIntentId);

                let paymentData: BookingRequestOfferPaymentData = {
                    setupIntentId,
                    paymentIntentId,
                    clientSecret: clientSecret || existingClientSecret,
                    ...(transferId ? { transferId } : {}),
                };
                if (extraTransferId) {
                    paymentData = paymentDataWithExtraTransfer(paymentData, extraTransferId);
                }

                await serverRuntime.db.transaction(async (transaction) => {
                    await transaction
                        .update(bookingRequestOffers)
                        .set({
                            paymentData,
                            paymentStatus: 'PAYED',
                            paymentDateTime: new Date(),
                        })
                        .where(eq(bookingRequestOffers.bookingRequestOfferId, data.bookingRequestOfferId));
                    await transaction.insert(bookingRequestOfferEvents).values({
                        bookingRequestOfferEventId: idCreate(),
                        bookingRequestOfferId: data.bookingRequestOfferId,
                        type: 'SYSTEM_PAYMENT_SUCCEEDED',
                        payload: { amountCents: totalCentsCustomer, source: 'PULL' },
                    });
                });
            } else {
                const { transferId } = await serverRuntime.stripe.transferCreate({
                    destinationAccountId: cook.stripeAccountId,
                    payoutAmount: offer.payoutCentsCook,
                });
                await serverRuntime.db.transaction(async (transaction) => {
                    await transaction
                        .update(bookingRequestOffers)
                        .set({
                            paymentData: { transferId },
                            paymentStatus: 'PAYED',
                            paymentDateTime: new Date(),
                        })
                        .where(eq(bookingRequestOffers.bookingRequestOfferId, data.bookingRequestOfferId));
                    await transaction.insert(bookingRequestOfferEvents).values({
                        bookingRequestOfferEventId: idCreate(),
                        bookingRequestOfferId: data.bookingRequestOfferId,
                        type: 'SYSTEM_PAYMENT_SUCCEEDED',
                        payload: { amountCents: totalCentsCustomer, source: 'PULL' },
                    });
                });
            }

            await Promise.all([
                serverRuntime.publish.userUpdates({ userId: customer.userId }),
                serverRuntime.publish.userUpdates({ userId: cook.cookId }),
                serverRuntime.publish.adminUpdates(),
            ]);

            await bookingRequestOfferPaymentSucceededSessionEventCreate(serverRuntime, {
                customerUserId: customer.userId,
                bookingRequestId: bookingRequest.bookingRequestId,
                bookingRequestOfferId: data.bookingRequestOfferId,
            });

            const { scheduleTestimonialReminderJobs } = await import('../../utils/scheduleTestimonialReminderJobs');
            await scheduleTestimonialReminderJobs(serverRuntime, {
                bookingRequestOfferId: data.bookingRequestOfferId,
                eventDate: bookingRequest.dateTime,
            });

            const { bookingRequestOfferEventTomorrowNotifySchedule } =
                await import('../../utils/bookingRequestOfferEventTomorrowNotifySchedule');
            await bookingRequestOfferEventTomorrowNotifySchedule(serverRuntime, {
                bookingRequestId: bookingRequest.bookingRequestId,
                bookingRequestOfferId: data.bookingRequestOfferId,
                eventDate: bookingRequest.dateTime,
            });

            const { slackNotifyPaymentConfirmed } = await import('../../slack/slackNotifyBooking');
            await slackNotifyPaymentConfirmed(serverRuntime, {
                bookingRequestId: bookingRequest.bookingRequestId,
                bookingRequestOfferId: data.bookingRequestOfferId,
                amountCents: totalCentsCustomer,
            });
        } catch (error) {
            const failDetail = error instanceof Error ? error.message : undefined;
            await serverRuntime.db.transaction(async (transaction) => {
                await transaction
                    .update(bookingRequestOffers)
                    .set({ paymentStatus: 'FAILED' })
                    .where(eq(bookingRequestOffers.bookingRequestOfferId, data.bookingRequestOfferId));
                await transaction.insert(bookingRequestOfferEvents).values({
                    bookingRequestOfferEventId: idCreate(),
                    bookingRequestOfferId: data.bookingRequestOfferId,
                    type: 'SYSTEM_PAYMENT_FAILED',
                    payload: {
                        source: 'PULL',
                        ...(failDetail?.trim() ? { detail: failDetail.trim() } : {}),
                    },
                });
            });
            await Promise.all([
                serverRuntime.publish.userUpdates({ userId: customer.userId }),
                serverRuntime.publish.userUpdates({ userId: cook.cookId }),
                serverRuntime.publish.adminUpdates(),
            ]);
            await bookingRequestOfferPaymentFailedSessionEventCreate(serverRuntime, {
                customerUserId: customer.userId,
                bookingRequestId: bookingRequest.bookingRequestId,
                bookingRequestOfferId: data.bookingRequestOfferId,
            });
            const { slackNotifyPaymentFailed } = await import('../../slack/slackNotifyBooking');
            await slackNotifyPaymentFailed(serverRuntime, {
                bookingRequestId: bookingRequest.bookingRequestId,
                bookingRequestOfferId: data.bookingRequestOfferId,
                detail: failDetail,
            });
            throw error;
        }
    },
    options: {
        retryLimit: 3,
        retryDelay: 60,
        expireInSeconds: 600,
    },
};
