import { and, eq, inArray, isNull } from 'drizzle-orm';

import { containsPhoneNumber } from '../../shared';
import { bookingRequestOfferPriceCalculate } from '../../shared/bookingRequestOfferPrice';
import { idCreate } from '../../shared/idCreate';
import {
    bookingRequestCooks,
    bookingRequestOfferEvents,
    bookingRequestOffers,
    bookingRequests,
    cooks,
    menus,
    promoCodes,
    users,
} from '../db/schema';
import { cookCanCreateOffersDerive } from '../domain/cook';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferCreateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyOfferCreated } from '../slack/slackNotifyBooking';
import { bookingRequestCookTravelDistanceKmEnsure } from '../utils/bookingRequestCookTravelDistanceKmEnsure';
import { cookBookingRequestOfferCreateEmailSend } from '../utils/bookingRequestLifecycleEmails';
import { bookingRequestNoOffersNotifyCancel } from '../utils/bookingRequestNoOffersNotifySchedule';
import { bookingRequestOfferHardMinimumAssert } from '../utils/bookingRequestOfferHardMinimumAssert';
import {
    bookingRequestOfferInitialChatMessageInsert,
    bookingRequestOfferInitialMessageResolve,
} from '../utils/bookingRequestOfferInitialChatMessage';
import { bookingRequestReactionReminderSchedule } from '../utils/bookingRequestReactionReminderSchedule';
import { menuDeepCopyInsert } from '../utils/menuDeepCopyInsert';

export async function cookBookingRequestOfferCreate(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestOfferCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    const input = args.input;
    const message = input.message?.trim() ?? '';
    try {
        if (!Number.isInteger(input.menuPriceCents) || input.menuPriceCents <= 0) {
            throw new Error('cookBookingRequestOfferCreate: menuPriceCents must be a positive integer');
        }
        if (message.length > 0 && containsPhoneNumber(message)) {
            throw new Error('cookBookingRequestOfferCreate: phone numbers are not allowed');
        }

        const [[cookRow], [bookingRequest], [existingOffer]] = await Promise.all([
            serverRuntime.db
                .select({ cook: cooks, status: users.status })
                .from(cooks)
                .innerJoin(users, eq(users.userId, cooks.cookId))
                .where(eq(cooks.cookId, cookId))
                .limit(1),
            serverRuntime.db.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, input.bookingRequestId)).limit(1),
            serverRuntime.db
                .select({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId })
                .from(bookingRequestOffers)
                .where(and(eq(bookingRequestOffers.bookingRequestId, input.bookingRequestId), eq(bookingRequestOffers.cookId, cookId)))
                .limit(1),
        ]);

        if (!cookRow) {
            throw new Error('cookBookingRequestOfferCreate: cook not found');
        }
        const { cook, status: userStatus } = cookRow;
        if (!bookingRequest) {
            throw new Error('cookBookingRequestOfferCreate: booking request not found');
        }
        if (existingOffer) {
            throw new Error('cookBookingRequestOfferCreate: offer already exists');
        }
        if (bookingRequest.userId === cookId) {
            throw new Error('cookBookingRequestOfferCreate: cannot offer on own request');
        }
        if (bookingRequest.canceledAt) {
            throw new Error('cookBookingRequestOfferCreate: booking request is canceled');
        }
        if (bookingRequest.expiresAt && bookingRequest.expiresAt < new Date()) {
            throw new Error('cookBookingRequestOfferCreate: booking request is expired');
        }
        if (!cookCanCreateOffersDerive(cook, userStatus)) {
            throw new Error('cookBookingRequestOfferCreate: cook cannot create offers');
        }

        const origin = cook.exactTravelOriginAddress;
        if (!origin) {
            throw new Error('cookBookingRequestOfferCreate: cook travel origin is required');
        }

        const uniqueMenuIds = [...new Set(input.suggestedMenuIds)];
        if (uniqueMenuIds.length > 0) {
            const suggestedMenus = await serverRuntime.db
                .select({ menuId: menus.menuId, title: menus.title })
                .from(menus)
                .where(
                    and(
                        eq(menus.cookId, cookId),
                        isNull(menus.deletedAt),
                        isNull(menus.bookingRequestOfferId),
                        inArray(menus.menuId, uniqueMenuIds),
                    ),
                );
            if (suggestedMenus.length !== uniqueMenuIds.length) {
                throw new Error('cookBookingRequestOfferCreate: one or more menus not found');
            }
        }

        const eventLocation = {
            latitude: bookingRequest.exactEventAddress.latitude,
            longitude: bookingRequest.exactEventAddress.longitude,
        };
        const [affinity] = await serverRuntime.db
            .select({ travelDistanceKm: bookingRequestCooks.travelDistanceKm })
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, cookId), eq(bookingRequestCooks.bookingRequestId, input.bookingRequestId)))
            .limit(1);
        const travelDistanceKm = await bookingRequestCookTravelDistanceKmEnsure(serverRuntime, {
            cookId,
            bookingRequestId: input.bookingRequestId,
            origin: { latitude: origin.latitude, longitude: origin.longitude },
            destination: eventLocation,
            existingTravelDistanceKm: affinity?.travelDistanceKm ?? null,
        });
        const travelExpensesCents = Math.round(travelDistanceKm * cook.travelExpensesAmount * 2);
        const price = bookingRequestOfferPriceCalculate({
            menuPriceCents: input.menuPriceCents,
            travelExpensesCents,
        });

        let promoMinimumTotalAmountCustomerCents: number | null = null;
        if (bookingRequest.promoCodeId != null) {
            const [promo] = await serverRuntime.db
                .select({ minimumTotalAmountCustomerCents: promoCodes.minimumTotalAmountCustomerCents })
                .from(promoCodes)
                .where(eq(promoCodes.promoCodeId, bookingRequest.promoCodeId))
                .limit(1);
            promoMinimumTotalAmountCustomerCents = promo?.minimumTotalAmountCustomerCents ?? null;
        }
        bookingRequestOfferHardMinimumAssert(price, promoMinimumTotalAmountCustomerCents, 'cookBookingRequestOfferCreate');

        const bookingRequestOfferId = idCreate();
        const menuTitles =
            uniqueMenuIds.length === 0
                ? []
                : (await serverRuntime.db.select({ title: menus.title }).from(menus).where(inArray(menus.menuId, uniqueMenuIds))).map(
                      (row) => row.title,
                  );

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction.insert(bookingRequestOffers).values({
                bookingRequestOfferId,
                bookingRequestId: input.bookingRequestId,
                cookId,
                cookAccepted: true,
                userAccepted: null,
                userUnreadNotificationCount: 1,
                cookUnreadNotificationCount: 0,
                travelDistanceKm,
                menuPriceCents: price.menuPriceCents,
                travelExpensesCents: price.travelExpensesCents,
                paymentProviderFeeCents: price.paymentProviderFeeCents,
                platformFeePercentCook: price.platformFeePercentCook,
                platformFeePercentCustomer: price.platformFeePercentCustomer,
                platformFeeCentsCook: price.platformFeeCentsCook,
                platformFeeCentsCustomer: price.platformFeeCentsCustomer,
                payoutCentsCook: price.payoutCentsCook,
                totalWithoutDiscountsCentsCustomer: price.totalWithoutDiscountsCentsCustomer,
                paymentStatus: 'EMPTY',
            });

            for (const sourceMenuId of uniqueMenuIds) {
                await menuDeepCopyInsert(transaction, {
                    cookId,
                    sourceMenuId,
                    bookingRequestOfferId,
                });
            }

            const cookCreatedAt = new Date();
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
                    menuTitles,
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
        });

        await bookingRequestNoOffersNotifyCancel(serverRuntime, input.bookingRequestId);
        await bookingRequestReactionReminderSchedule(serverRuntime, { bookingRequestId: input.bookingRequestId });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: cookId }),
            serverRuntime.publish.userUpdates({ userId: bookingRequest.userId }),
        ]);

        await cookBookingRequestOfferCreateEmailSend(serverRuntime, {
            bookingRequestOfferId,
            bookingRequestId: input.bookingRequestId,
            customerUserId: bookingRequest.userId,
            cookId,
            occasion: bookingRequest.occasion,
            dateTime: bookingRequest.dateTime,
            address: bookingRequest.exactEventAddress.displayText,
            suggestedMenuTitles: menuTitles,
        });

        const [cookUser] = await serverRuntime.db
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.userId, cookId))
            .limit(1);

        await slackNotifyOfferCreated(serverRuntime, {
            bookingRequestId: input.bookingRequestId,
            bookingRequestOfferId,
            cookName: cookUser ? `${cookUser.firstName} ${cookUser.lastName}` : cookId,
            totalCentsCustomer: price.totalWithoutDiscountsCentsCustomer,
        });

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
