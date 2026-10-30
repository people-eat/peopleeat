import { and, eq } from 'drizzle-orm';

import { containsPhoneNumber } from '../../shared';
import { bookingRequestOfferPriceCalculate } from '../../shared/bookingRequestOfferPrice';
import { idCreate } from '../../shared/idCreate';
import type { BookingRequestOfferCreate } from '../db/schema';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferCreateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestNoOffersNotifyCancel } from '../utils/bookingRequestNoOffersNotifySchedule';
import { bookingRequestOfferEventTomorrowNotifySchedule } from '../utils/bookingRequestOfferEventTomorrowNotifySchedule';
import {
    bookingRequestOfferInitialChatMessageInsert,
    bookingRequestOfferInitialMessageResolve,
} from '../utils/bookingRequestOfferInitialChatMessage';
import { bookingRequestReactionReminderSchedule } from '../utils/bookingRequestReactionReminderSchedule';

function assertNonNegativeInt(value: number, fieldName: string): void {
    if (!Number.isInteger(value) || value < 0) {
        throw new Error(`adminBookingRequestOfferCreate: ${fieldName} must be a non-negative integer`);
    }
}

function assertPlatformFeePercent(value: number, fieldName: string): void {
    if (!Number.isInteger(value) || value < 0 || value > 100) {
        throw new Error(`adminBookingRequestOfferCreate: ${fieldName} must be an integer from 0 to 100`);
    }
}

export async function adminBookingRequestOfferCreate(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestOfferCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const input = args.input;
    const bookingRequestId = input.bookingRequestId.trim();
    const cookId = input.cookId.trim();
    const message = input.message?.trim() ?? '';

    if (bookingRequestId.length === 0) {
        throw new Error('adminBookingRequestOfferCreate: bookingRequestId must not be empty');
    }
    if (cookId.length === 0) {
        throw new Error('adminBookingRequestOfferCreate: cookId must not be empty');
    }

    assertNonNegativeInt(input.menuPriceCents, 'menuPriceCents');
    assertNonNegativeInt(input.travelExpensesCents, 'travelExpensesCents');
    if (input.platformFeePercentCook != null) {
        assertPlatformFeePercent(input.platformFeePercentCook, 'platformFeePercentCook');
    }
    if (input.platformFeePercentCustomer != null) {
        assertPlatformFeePercent(input.platformFeePercentCustomer, 'platformFeePercentCustomer');
    }

    if (input.menuPriceCents <= 0) {
        throw new Error('adminBookingRequestOfferCreate: menuPriceCents must be a positive integer');
    }
    if (message.length > 0 && containsPhoneNumber(message)) {
        throw new Error('adminBookingRequestOfferCreate: phone numbers are not allowed');
    }

    try {
        const [[cook], [bookingRequest], [existingOffer]] = await Promise.all([
            serverRuntime.db.select().from(cooks).where(eq(cooks.cookId, cookId)).limit(1),
            serverRuntime.db.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId)).limit(1),
            serverRuntime.db
                .select({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId })
                .from(bookingRequestOffers)
                .where(and(eq(bookingRequestOffers.bookingRequestId, bookingRequestId), eq(bookingRequestOffers.cookId, cookId)))
                .limit(1),
        ]);

        if (!cook) {
            throw new Error('adminBookingRequestOfferCreate: cook not found');
        }
        if (!bookingRequest) {
            throw new Error('adminBookingRequestOfferCreate: booking request not found');
        }
        if (existingOffer) {
            throw new Error('adminBookingRequestOfferCreate: offer already exists');
        }
        if (bookingRequest.userId === cookId) {
            throw new Error('adminBookingRequestOfferCreate: cannot offer on own request');
        }
        if (bookingRequest.canceledAt) {
            throw new Error('adminBookingRequestOfferCreate: booking request is canceled');
        }

        const dualAccepted = input.userAccepted === true && input.cookAccepted === true;
        const bookingRequestOfferId = idCreate();
        const cookCreatedAt = input.createdAt != null ? new Date(input.createdAt) : new Date();
        if (Number.isNaN(cookCreatedAt.getTime())) {
            throw new Error('adminBookingRequestOfferCreate: invalid createdAt');
        }

        const price = bookingRequestOfferPriceCalculate({
            menuPriceCents: input.menuPriceCents,
            travelExpensesCents: input.travelExpensesCents,
            ...(input.platformFeePercentCook != null ? { platformFeePercentCook: input.platformFeePercentCook } : {}),
            ...(input.platformFeePercentCustomer != null ? { platformFeePercentCustomer: input.platformFeePercentCustomer } : {}),
        });

        const offerInsert: BookingRequestOfferCreate = {
            bookingRequestOfferId,
            bookingRequestId,
            cookId,
            cookAccepted: input.cookAccepted ?? null,
            userAccepted: input.userAccepted ?? null,
            userUnreadNotificationCount: input.notifyCustomer ? 1 : 0,
            cookUnreadNotificationCount: 0,
            travelDistanceKm: input.travelDistanceKm ?? null,
            menuPriceCents: price.menuPriceCents,
            travelExpensesCents: price.travelExpensesCents,
            paymentProviderFeeCents: price.paymentProviderFeeCents,
            platformFeePercentCook: price.platformFeePercentCook,
            platformFeePercentCustomer: price.platformFeePercentCustomer,
            platformFeeCentsCook: price.platformFeeCentsCook,
            platformFeeCentsCustomer: price.platformFeeCentsCustomer,
            payoutCentsCook: price.payoutCentsCook,
            totalWithoutDiscountsCentsCustomer: price.totalWithoutDiscountsCentsCustomer,
            paymentStatus: dualAccepted ? 'PAYED_OUT_OF_SYSTEM' : 'EMPTY',
            paymentDateTime: input.paymentDateTime ?? null,
            plannedPayoutDateTime: input.plannedPayoutDateTime ?? null,
            payoutDateTime: input.payoutDateTime ?? null,
            createdAt: cookCreatedAt,
        };

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction.insert(bookingRequestOffers).values(offerInsert);

            const initialMessage = bookingRequestOfferInitialMessageResolve(bookingRequest);
            if (initialMessage.length > 0) {
                await bookingRequestOfferInitialChatMessageInsert(transaction, {
                    bookingRequestOfferId,
                    initialMessage,
                    cookCreatedAt,
                });
            }

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId,
                type: 'COOK_CREATED',
                payload: {
                    menuTitles: [],
                    menuPriceCents: price.menuPriceCents,
                    totalWithoutDiscountsCentsCustomer: price.totalWithoutDiscountsCentsCustomer,
                },
                createdAt: cookCreatedAt,
            });

            if (message.length > 0) {
                await transaction.insert(bookingRequestOfferEvents).values({
                    bookingRequestOfferEventId: idCreate(),
                    bookingRequestOfferId,
                    type: 'COOK_MESSAGE_SIMPLE',
                    payload: { messageBody: message },
                    createdAt: new Date(cookCreatedAt.getTime() + 1),
                });
            }

            if (dualAccepted) {
                await transaction.insert(bookingRequestOfferEvents).values({
                    bookingRequestOfferEventId: idCreate(),
                    bookingRequestOfferId,
                    type: 'ADMIN_PAYED_OUT_OF_SYSTEM',
                    payload: {
                        amountCents: price.payoutCentsCook,
                        source: 'ADMIN_OFFER_CREATE',
                    },
                    createdAt: new Date(cookCreatedAt.getTime() + (message.length > 0 ? 2 : 1)),
                });
            }
        });

        await bookingRequestNoOffersNotifyCancel(serverRuntime, bookingRequestId);
        await bookingRequestReactionReminderSchedule(serverRuntime, { bookingRequestId });

        if (dualAccepted) {
            await bookingRequestOfferEventTomorrowNotifySchedule(serverRuntime, {
                bookingRequestId,
                bookingRequestOfferId,
                eventDate: bookingRequest.dateTime,
            });
        }

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: cookId }),
            serverRuntime.publish.userUpdates({ userId: bookingRequest.userId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
