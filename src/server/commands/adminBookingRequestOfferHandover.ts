import { and, asc, eq, inArray } from 'drizzle-orm';

import { bookingRequestOfferPriceCalculate, userDisplayName } from '../../shared';
import { idCreate } from '../../shared/idCreate';
import type { DatabaseTransaction } from '../db';
import type { BookingRequestOfferCreate, BookingRequestOfferEvent, BookingRequestOfferEventAttachmentCreate } from '../db/schema';
import {
    bookingRequestOfferEventAttachments,
    bookingRequestOfferEvents,
    bookingRequestOffers,
    bookingRequests,
    cookCallSlotBookings,
    cooks,
    users,
} from '../db/schema';
import type {
    BookingRequestOfferEventPayload,
    BookingRequestOfferEventType,
    BookingRequestOfferPaymentData,
    BookingRequestOfferPaymentStatus,
} from '../domain/bookingRequest';
import { bookingRequestOfferPaymentIsPaid } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferHandoverArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferCallSlotsCompleteCancel } from '../utils/bookingRequestOfferCallSlotsCompleteSchedule';
import { bookingRequestOfferEventTomorrowNotifySchedule } from '../utils/bookingRequestOfferEventTomorrowNotifySchedule';
import {
    bookingRequestOfferInitialChatMessageInsert,
    bookingRequestOfferInitialMessageResolve,
} from '../utils/bookingRequestOfferInitialChatMessage';
import { paymentTransferIdsForCookReverse } from '../utils/bookingRequestOfferPaymentDataTransfers';
import { bookingRequestOfferPaymentPrepare } from '../utils/bookingRequestOfferPaymentPrepare';
import { bookingRequestOfferQueuedJobsCancel } from '../utils/bookingRequestOfferQueuedJobsCancel';

const MESSAGE_SIMPLE_TYPES = [
    'USER_MESSAGE_SIMPLE',
    'COOK_MESSAGE_SIMPLE',
    'ADMIN_MESSAGE_SIMPLE',
] as const satisfies ReadonlyArray<BookingRequestOfferEventType>;

type MessageSimpleType = (typeof MESSAGE_SIMPLE_TYPES)[number];

function isMessageSimpleType(type: BookingRequestOfferEventType): type is MessageSimpleType {
    return (MESSAGE_SIMPLE_TYPES as ReadonlyArray<string>).includes(type);
}

function assertNonNegativeInt(value: number, fieldName: string): void {
    if (!Number.isInteger(value) || value < 0) {
        throw new Error(`adminBookingRequestOfferHandover: ${fieldName} must be a non-negative integer`);
    }
}

async function paymentTransferIdsResolve(
    serverRuntime: ServerRuntime,
    paymentData: BookingRequestOfferPaymentData | null,
): Promise<{ transferIds: string[]; paymentIntentId?: string }> {
    if (!paymentData) return { transferIds: [] };

    const transferIds = await paymentTransferIdsForCookReverse(serverRuntime, paymentData);
    const paymentIntentId = 'paymentIntentId' in paymentData ? paymentData.paymentIntentId : undefined;
    return { transferIds, paymentIntentId };
}

/** Hard-copy MESSAGE_SIMPLE events (+ attachment joins) onto the target offer. */
async function bookingRequestOfferChatMessagesCopy(
    transaction: DatabaseTransaction,
    input: {
        sourceOfferId: string;
        targetOfferId: string;
        sourceCookId: string;
        sourceCookDisplayName: string;
        sortBaseAt: Date;
    },
): Promise<number> {
    const sourceEvents = await transaction
        .select()
        .from(bookingRequestOfferEvents)
        .where(
            and(
                eq(bookingRequestOfferEvents.bookingRequestOfferId, input.sourceOfferId),
                inArray(bookingRequestOfferEvents.type, [...MESSAGE_SIMPLE_TYPES]),
            ),
        )
        .orderBy(asc(bookingRequestOfferEvents.createdAt), asc(bookingRequestOfferEvents.bookingRequestOfferEventId));

    const messageEvents = sourceEvents.filter((event): event is BookingRequestOfferEvent & { type: MessageSimpleType } =>
        isMessageSimpleType(event.type),
    );
    if (messageEvents.length === 0) {
        return 0;
    }

    const sourceEventIds = messageEvents.map((event) => event.bookingRequestOfferEventId);
    const sourceAttachments = await transaction
        .select()
        .from(bookingRequestOfferEventAttachments)
        .where(inArray(bookingRequestOfferEventAttachments.bookingRequestOfferEventId, sourceEventIds));

    const attachmentsBySourceEventId = new Map<string, typeof sourceAttachments>();
    for (const attachment of sourceAttachments) {
        const list = attachmentsBySourceEventId.get(attachment.bookingRequestOfferEventId) ?? [];
        list.push(attachment);
        attachmentsBySourceEventId.set(attachment.bookingRequestOfferEventId, list);
    }

    const copiedEvents: Array<{
        bookingRequestOfferEventId: string;
        bookingRequestOfferId: string;
        type: MessageSimpleType;
        payload: BookingRequestOfferEventPayload;
        createdAt: Date;
    }> = [];
    const copiedAttachments: BookingRequestOfferEventAttachmentCreate[] = [];

    for (const [index, sourceEvent] of messageEvents.entries()) {
        const newEventId = idCreate();
        const sourcePayload = sourceEvent.payload as {
            messageBody: string;
            mediaUrls?: string[];
            hiddenByAdmin?: boolean;
        };
        const hiddenByAdminFields = sourcePayload.hiddenByAdmin === true ? ({ hiddenByAdmin: true } as const) : ({} as const);
        const payload: BookingRequestOfferEventPayload =
            sourceEvent.type === 'COOK_MESSAGE_SIMPLE'
                ? {
                      messageBody: sourcePayload.messageBody,
                      ...(sourcePayload.mediaUrls ? { mediaUrls: sourcePayload.mediaUrls } : {}),
                      ...hiddenByAdminFields,
                      originalCreatedAt: sourceEvent.createdAt.toISOString(),
                      handedOverFrom: {
                          cookId: input.sourceCookId,
                          cookDisplayName: input.sourceCookDisplayName,
                          sourceEventId: sourceEvent.bookingRequestOfferEventId,
                      },
                  }
                : {
                      messageBody: sourcePayload.messageBody,
                      ...(sourcePayload.mediaUrls ? { mediaUrls: sourcePayload.mediaUrls } : {}),
                      ...hiddenByAdminFields,
                      originalCreatedAt: sourceEvent.createdAt.toISOString(),
                  };

        copiedEvents.push({
            bookingRequestOfferEventId: newEventId,
            bookingRequestOfferId: input.targetOfferId,
            type: sourceEvent.type,
            payload,
            createdAt: new Date(input.sortBaseAt.getTime() + index + 1),
        });

        const attachments = attachmentsBySourceEventId.get(sourceEvent.bookingRequestOfferEventId) ?? [];
        for (const attachment of attachments) {
            copiedAttachments.push({
                bookingRequestOfferEventId: newEventId,
                fileUploadId: attachment.fileUploadId,
                position: attachment.position,
            });
        }
    }

    await transaction.insert(bookingRequestOfferEvents).values(copiedEvents);
    if (copiedAttachments.length > 0) {
        await transaction.insert(bookingRequestOfferEventAttachments).values(copiedAttachments);
    }

    return copiedEvents.length;
}

export async function adminBookingRequestOfferHandover(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestOfferHandoverArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const input = args.input;
    const sourceOfferId = input.bookingRequestOfferId.trim();
    const targetCookId = input.cookId.trim();

    if (sourceOfferId.length === 0) {
        throw new Error('adminBookingRequestOfferHandover: bookingRequestOfferId must not be empty');
    }
    if (targetCookId.length === 0) {
        throw new Error('adminBookingRequestOfferHandover: cookId must not be empty');
    }

    try {
        const [sourceOffer] = await serverRuntime.db
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, sourceOfferId))
            .limit(1);
        if (!sourceOffer) {
            throw new Error('adminBookingRequestOfferHandover: offer not found');
        }
        if (!(sourceOffer.userAccepted === true && sourceOffer.cookAccepted === true)) {
            throw new Error('adminBookingRequestOfferHandover: source offer must be dual-accepted');
        }
        if (sourceOffer.cookId === targetCookId) {
            throw new Error('adminBookingRequestOfferHandover: target cook must differ from source cook');
        }

        const [bookingRequest] = await serverRuntime.db
            .select()
            .from(bookingRequests)
            .where(eq(bookingRequests.bookingRequestId, sourceOffer.bookingRequestId))
            .limit(1);
        if (!bookingRequest) {
            throw new Error('adminBookingRequestOfferHandover: booking request not found');
        }
        if (bookingRequest.canceledAt) {
            throw new Error('adminBookingRequestOfferHandover: booking request is canceled');
        }
        if (bookingRequest.dateTime.getTime() <= Date.now()) {
            throw new Error('adminBookingRequestOfferHandover: event date must be in the future');
        }
        if (bookingRequest.userId === targetCookId) {
            throw new Error('adminBookingRequestOfferHandover: cannot offer on own request');
        }

        if (sourceOffer.paymentStatus === 'TRANSFERRED') {
            throw new Error(
                'adminBookingRequestOfferHandover: cannot hand over after bank payout (TRANSFERRED); reverse payout in Stripe first',
            );
        }
        if (sourceOffer.paymentStatus === 'PAYED_OUT_OF_SYSTEM' && input.confirmOutOfSystemMoneyHandled !== true) {
            throw new Error('adminBookingRequestOfferHandover: confirmOutOfSystemMoneyHandled required for PAYED_OUT_OF_SYSTEM');
        }

        const [[sourceCookUser], [targetCook], [targetCookUser], [customer], [existingTargetOffer]] = await Promise.all([
            serverRuntime.db.select().from(users).where(eq(users.userId, sourceOffer.cookId)).limit(1),
            serverRuntime.db.select().from(cooks).where(eq(cooks.cookId, targetCookId)).limit(1),
            serverRuntime.db.select().from(users).where(eq(users.userId, targetCookId)).limit(1),
            serverRuntime.db.select().from(users).where(eq(users.userId, bookingRequest.userId)).limit(1),
            serverRuntime.db
                .select()
                .from(bookingRequestOffers)
                .where(
                    and(
                        eq(bookingRequestOffers.bookingRequestId, sourceOffer.bookingRequestId),
                        eq(bookingRequestOffers.cookId, targetCookId),
                    ),
                )
                .limit(1),
        ]);

        if (!sourceCookUser || !targetCook || !targetCookUser || !customer) {
            throw new Error('adminBookingRequestOfferHandover: cook or customer not found');
        }

        const menuPriceCents = input.copyPrice ? (input.menuPriceCents ?? sourceOffer.menuPriceCents) : (input.menuPriceCents ?? null);
        const travelExpensesCents = input.copyPrice
            ? (input.travelExpensesCents ?? sourceOffer.travelExpensesCents)
            : (input.travelExpensesCents ?? null);

        if (menuPriceCents == null || travelExpensesCents == null) {
            throw new Error(
                'adminBookingRequestOfferHandover: menuPriceCents and travelExpensesCents are required when copyPrice is false',
            );
        }
        assertNonNegativeInt(menuPriceCents, 'menuPriceCents');
        assertNonNegativeInt(travelExpensesCents, 'travelExpensesCents');
        if (menuPriceCents <= 0) {
            throw new Error('adminBookingRequestOfferHandover: menuPriceCents must be a positive integer');
        }

        const price = bookingRequestOfferPriceCalculate({
            menuPriceCents,
            travelExpensesCents,
            ...(input.copyPrice
                ? {
                      platformFeePercentCook: sourceOffer.platformFeePercentCook,
                      platformFeePercentCustomer: sourceOffer.platformFeePercentCustomer,
                  }
                : {}),
        });
        const travelDistanceKm = input.copyPrice
            ? (input.travelDistanceKm ?? sourceOffer.travelDistanceKm)
            : (input.travelDistanceKm ?? null);

        const paymentDateTime = input.copyScheduleTimestamps
            ? (input.paymentDateTime ?? sourceOffer.paymentDateTime)
            : (input.paymentDateTime ?? null);
        const plannedPaymentPullDateTime = input.copyScheduleTimestamps
            ? (input.plannedPaymentPullDateTime ?? sourceOffer.plannedPaymentPullDateTime)
            : (input.plannedPaymentPullDateTime ?? null);
        const plannedPayoutDateTime = input.copyScheduleTimestamps
            ? (input.plannedPayoutDateTime ?? sourceOffer.plannedPayoutDateTime)
            : (input.plannedPayoutDateTime ?? null);

        const cookNameBefore = userDisplayName(sourceCookUser);
        const cookNameAfter = userDisplayName(targetCookUser);
        const copyChatMessages = input.copyChatMessages === true;
        const handoverPayload = {
            cookIdBefore: sourceOffer.cookId,
            cookNameBefore,
            cookIdAfter: targetCookId,
            cookNameAfter,
            ...(copyChatMessages ? { chatCopied: true as const } : {}),
        };

        // --- Money teardown / re-route (before DB close so failures abort cleanly) ---
        let nextPaymentStatus: BookingRequestOfferPaymentStatus;
        let nextPaymentData: BookingRequestOfferPaymentData | null = null;
        let nextPaymentDateTime = paymentDateTime;
        let nextPlannedPaymentPullDateTime = plannedPaymentPullDateTime;
        let nextPlannedPayoutDateTime = plannedPayoutDateTime;

        if (sourceOffer.paymentStatus === 'PAYED_OUT_OF_SYSTEM') {
            nextPaymentStatus = 'PAYED_OUT_OF_SYSTEM';
            nextPaymentData = null;
        } else if (sourceOffer.paymentStatus === 'PAYED') {
            if (!targetCook.stripeAccountId || !targetCook.stripeAccountActive) {
                throw new Error('adminBookingRequestOfferHandover: target cook Stripe Connect is not ready');
            }
            const { transferIds, paymentIntentId } = await paymentTransferIdsResolve(serverRuntime, sourceOffer.paymentData);
            if (transferIds.length === 0 && price.payoutCentsCook > 0) {
                throw new Error('adminBookingRequestOfferHandover: could not resolve Connect transfer ids to reverse');
            }
            for (const transferId of transferIds) {
                await serverRuntime.stripe.transferReverse({ transferId });
            }
            const { transferId: newTransferId } = await serverRuntime.stripe.transferCreate({
                destinationAccountId: targetCook.stripeAccountId,
                payoutAmount: price.payoutCentsCook,
            });
            if (paymentIntentId && sourceOffer.paymentData && 'clientSecret' in sourceOffer.paymentData) {
                const prior = sourceOffer.paymentData;
                nextPaymentData =
                    'setupIntentId' in prior
                        ? {
                              setupIntentId: prior.setupIntentId,
                              paymentIntentId,
                              clientSecret: prior.clientSecret,
                              transferId: newTransferId,
                          }
                        : {
                              paymentIntentId,
                              clientSecret: prior.clientSecret,
                              transferId: newTransferId,
                          };
            } else {
                nextPaymentData = { transferId: newTransferId };
            }
            nextPaymentStatus = 'PAYED';
            nextPaymentDateTime = nextPaymentDateTime ?? new Date();
            nextPlannedPaymentPullDateTime = null;
            nextPlannedPayoutDateTime = nextPlannedPayoutDateTime ?? sourceOffer.plannedPayoutDateTime;
        } else {
            // EMPTY / SETUP / FAILED — cancel unpaid PI + jobs, prepare for new cook
            if (
                sourceOffer.paymentData &&
                'paymentIntentId' in sourceOffer.paymentData &&
                sourceOffer.paymentData.paymentIntentId &&
                (sourceOffer.paymentStatus === 'EMPTY' || sourceOffer.paymentStatus === 'FAILED')
            ) {
                try {
                    await serverRuntime.stripe.paymentIntentCancel(sourceOffer.paymentData.paymentIntentId);
                } catch {
                    // Already canceled / succeeded — ignore; prepare will create a fresh intent.
                }
            }
            if (!targetCook.stripeAccountId || !targetCook.stripeAccountActive) {
                throw new Error('adminBookingRequestOfferHandover: target cook Stripe Connect is not ready');
            }
            if (!customer.emailAddress) {
                throw new Error('adminBookingRequestOfferHandover: customer email required for payment prepare');
            }
            const prepared = await bookingRequestOfferPaymentPrepare(serverRuntime, {
                userId: customer.userId,
                emailAddress: customer.emailAddress,
                firstName: customer.firstName,
                lastName: customer.lastName,
                destinationAccountId: targetCook.stripeAccountId,
                totalCentsCustomer: price.totalWithoutDiscountsCentsCustomer,
                payoutCentsCook: price.payoutCentsCook,
                eventDateTime: bookingRequest.dateTime,
            });
            nextPaymentStatus = prepared.paymentStatus;
            nextPaymentData = prepared.paymentData;
            nextPaymentDateTime = prepared.paymentDateTime;
            nextPlannedPaymentPullDateTime = prepared.plannedPaymentPullDateTime;
            nextPlannedPayoutDateTime = prepared.plannedPayoutDateTime;
        }

        await bookingRequestOfferQueuedJobsCancel(serverRuntime, sourceOfferId);

        const targetOfferId = existingTargetOffer?.bookingRequestOfferId ?? idCreate();
        const now = new Date();
        const configuredMenu = input.copyConfiguredMenu && sourceOffer.configuredMenu != null ? sourceOffer.configuredMenu : null;
        let canceledSlotIds: string[] = [];

        const offerUpsert: BookingRequestOfferCreate = {
            bookingRequestOfferId: targetOfferId,
            bookingRequestId: sourceOffer.bookingRequestId,
            cookId: targetCookId,
            cookAccepted: true,
            userAccepted: true,
            userUnreadNotificationCount: 1,
            cookUnreadNotificationCount: 1,
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
            paymentStatus: nextPaymentStatus,
            paymentData: nextPaymentData,
            paymentDateTime: nextPaymentDateTime,
            plannedPaymentPullDateTime: nextPlannedPaymentPullDateTime,
            plannedPayoutDateTime: nextPlannedPayoutDateTime,
            configuredMenu,
            createdAt: existingTargetOffer?.createdAt ?? now,
        };

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(bookingRequestOffers)
                .set({
                    userAccepted: false,
                    cookAccepted: false,
                })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, sourceOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId: sourceOfferId,
                type: 'ADMIN_HANDED_OVER_CLOSED',
                payload: handoverPayload,
                createdAt: now,
            });

            const openSlots = await transaction
                .select({
                    cookCallSlotBookingId: cookCallSlotBookings.cookCallSlotBookingId,
                    startAt: cookCallSlotBookings.startAt,
                    endAt: cookCallSlotBookings.endAt,
                    status: cookCallSlotBookings.status,
                })
                .from(cookCallSlotBookings)
                .where(
                    and(
                        eq(cookCallSlotBookings.bookingRequestOfferId, sourceOfferId),
                        inArray(cookCallSlotBookings.status, ['PENDING', 'CONFIRMED']),
                    ),
                );

            if (openSlots.length > 0) {
                canceledSlotIds = openSlots.map((slot) => slot.cookCallSlotBookingId);
                await transaction
                    .update(cookCallSlotBookings)
                    .set({
                        status: 'CANCELED',
                        canceledBy: 'CUSTOMER',
                        canceledReason: 'HANDED_OVER',
                    })
                    .where(
                        inArray(
                            cookCallSlotBookings.cookCallSlotBookingId,
                            openSlots.map((slot) => slot.cookCallSlotBookingId),
                        ),
                    );
                await transaction.insert(bookingRequestOfferEvents).values(
                    openSlots.map((slot) => ({
                        bookingRequestOfferEventId: idCreate(),
                        bookingRequestOfferId: sourceOfferId,
                        type: 'USER_CALL_SLOT_CANCELLED' as const,
                        payload: {
                            cookCallSlotBookingId: slot.cookCallSlotBookingId,
                            startAt: slot.startAt.toISOString(),
                            endAt: slot.endAt.toISOString(),
                            wasConfirmed: slot.status === 'CONFIRMED',
                            reason: 'HANDED_OVER',
                        },
                        createdAt: now,
                    })),
                );
            }

            if (existingTargetOffer) {
                await transaction
                    .update(bookingRequestOffers)
                    .set({
                        cookAccepted: true,
                        userAccepted: true,
                        userUnreadNotificationCount: existingTargetOffer.userUnreadNotificationCount + 1,
                        cookUnreadNotificationCount: existingTargetOffer.cookUnreadNotificationCount + 1,
                        travelDistanceKm: offerUpsert.travelDistanceKm,
                        menuPriceCents: offerUpsert.menuPriceCents,
                        travelExpensesCents: offerUpsert.travelExpensesCents,
                        paymentProviderFeeCents: offerUpsert.paymentProviderFeeCents,
                        platformFeePercentCook: offerUpsert.platformFeePercentCook,
                        platformFeePercentCustomer: offerUpsert.platformFeePercentCustomer,
                        platformFeeCentsCook: offerUpsert.platformFeeCentsCook,
                        platformFeeCentsCustomer: offerUpsert.platformFeeCentsCustomer,
                        payoutCentsCook: offerUpsert.payoutCentsCook,
                        totalWithoutDiscountsCentsCustomer: offerUpsert.totalWithoutDiscountsCentsCustomer,
                        paymentStatus: offerUpsert.paymentStatus,
                        paymentData: offerUpsert.paymentData,
                        paymentDateTime: offerUpsert.paymentDateTime,
                        plannedPaymentPullDateTime: offerUpsert.plannedPaymentPullDateTime,
                        plannedPayoutDateTime: offerUpsert.plannedPayoutDateTime,
                        configuredMenu: offerUpsert.configuredMenu,
                    })
                    .where(eq(bookingRequestOffers.bookingRequestOfferId, targetOfferId));
            } else {
                await transaction.insert(bookingRequestOffers).values(offerUpsert);

                // When copying chat, the booking-request seed is already in the
                // source transcript — skip the usual initial USER_MESSAGE_SIMPLE.
                if (!copyChatMessages) {
                    const initialMessage = bookingRequestOfferInitialMessageResolve(bookingRequest);
                    if (initialMessage.length > 0) {
                        await bookingRequestOfferInitialChatMessageInsert(transaction, {
                            bookingRequestOfferId: targetOfferId,
                            initialMessage,
                            cookCreatedAt: now,
                        });
                    }
                }

                await transaction.insert(bookingRequestOfferEvents).values({
                    bookingRequestOfferEventId: idCreate(),
                    bookingRequestOfferId: targetOfferId,
                    type: 'COOK_CREATED',
                    payload: {
                        menuTitles: [],
                        menuPriceCents: price.menuPriceCents,
                        totalWithoutDiscountsCentsCustomer: price.totalWithoutDiscountsCentsCustomer,
                    },
                    createdAt: now,
                });
            }

            let chatCopyCount = 0;
            if (copyChatMessages) {
                chatCopyCount = await bookingRequestOfferChatMessagesCopy(transaction, {
                    sourceOfferId,
                    targetOfferId,
                    sourceCookId: sourceOffer.cookId,
                    sourceCookDisplayName: cookNameBefore,
                    sortBaseAt: now,
                });
            }

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId: targetOfferId,
                type: 'ADMIN_HANDED_OVER_TO_COOK',
                payload: handoverPayload,
                createdAt: new Date(now.getTime() + chatCopyCount + 1),
            });
        });

        await Promise.all(
            canceledSlotIds.map((cookCallSlotBookingId) =>
                bookingRequestOfferCallSlotsCompleteCancel(serverRuntime, cookCallSlotBookingId),
            ),
        );

        if (bookingRequestOfferPaymentIsPaid(nextPaymentStatus)) {
            await bookingRequestOfferEventTomorrowNotifySchedule(serverRuntime, {
                bookingRequestId: sourceOffer.bookingRequestId,
                bookingRequestOfferId: targetOfferId,
                eventDate: bookingRequest.dateTime,
            });
        }

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: bookingRequest.userId }),
            serverRuntime.publish.userUpdates({ userId: sourceOffer.cookId }),
            serverRuntime.publish.userUpdates({ userId: targetCookId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        return { success: true, referenceId: targetOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
