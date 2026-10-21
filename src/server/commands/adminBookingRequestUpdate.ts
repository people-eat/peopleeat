import { eq, sql } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { textNormalizeProse, textNormalizeProseTitled, textNormalizeSingleLine, textNormalizeTitled } from '../../shared/textNormalize';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequestParticipants, bookingRequests } from '../db/schema';
import type {
    BookingRequestExactEventAddress,
    BookingRequestParticipantType,
    BookingRequestPriceClassType,
} from '../domain/bookingRequest';
import { bookingRequestOfferPaymentIsPaid } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationBookingRequestUpdateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestAdjustedMessageGenerateScheduleIfEnabled } from '../utils/bookingRequestAdjustedMessageGenerateSchedule';
import { bookingRequestCookTravelDistanceKmClear } from '../utils/bookingRequestCookTravelDistanceKmEnsure';
import { bookingRequestExpireNotifySchedule } from '../utils/bookingRequestExpireNotifySchedule';
import { bookingRequestExpiresAt } from '../utils/bookingRequestExpiresAt';
import { userBookingRequestUpdateEmailSend } from '../utils/bookingRequestLifecycleEmails';
import { bookingRequestNoOffersNotifySchedule } from '../utils/bookingRequestNoOffersNotifySchedule';
import { bookingRequestOfferEventTomorrowNotifySchedule } from '../utils/bookingRequestOfferEventTomorrowNotifySchedule';
import { bookingRequestParticipantsPrepareForWrite } from '../utils/bookingRequestParticipantsPrepareForWrite';
import { scheduleTestimonialReminderJobs } from '../utils/scheduleTestimonialReminderJobs';

function preferencesEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
}

function exactEventAddressNormalize(
    input: NonNullable<GqlSAdminMutationBookingRequestUpdateArgs['input']['exactEventAddress']>,
): BookingRequestExactEventAddress {
    const address: BookingRequestExactEventAddress = {
        displayText: textNormalizeSingleLine(input.displayText),
        latitude: input.latitude,
        longitude: input.longitude,
        addressLine1: textNormalizeSingleLine(input.addressLine1),
        addressLine2: textNormalizeSingleLine(input.addressLine2),
        city: textNormalizeTitled(input.city),
        postCode: textNormalizeSingleLine(input.postCode),
        state: textNormalizeSingleLine(input.state),
        country: textNormalizeSingleLine(input.country),
    };
    if (address.displayText.length === 0 || address.city.length === 0) {
        throw new Error('adminBookingRequestUpdate: exactEventAddress is incomplete');
    }
    return address;
}

export async function adminBookingRequestUpdate(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const bookingRequestId = args.bookingRequestId.trim();
    if (bookingRequestId.length === 0) {
        throw new Error('adminBookingRequestUpdate: bookingRequestId must not be empty');
    }

    const input = args.input;

    try {
        const [bookingRequest] = await serverRuntime.db
            .select()
            .from(bookingRequests)
            .where(eq(bookingRequests.bookingRequestId, bookingRequestId))
            .limit(1);

        if (!bookingRequest) {
            throw new Error('adminBookingRequestUpdate: booking request not found');
        }

        const requestPatch: {
            occasion?: string;
            dateTime?: Date;
            expiresAt?: Date | null;
            originalMessage?: string;
            adjustedMessage?: string | null;
            priceClassType?: BookingRequestPriceClassType;
            createdAt?: Date;
            exactEventAddress?: BookingRequestExactEventAddress;
        } = {};

        if (input.occasion != null) {
            const nextOccasion = textNormalizeTitled(input.occasion);
            if (nextOccasion.length === 0) {
                throw new Error('adminBookingRequestUpdate: occasion must not be empty');
            }
            if (nextOccasion !== bookingRequest.occasion) {
                requestPatch.occasion = nextOccasion;
            }
        }

        let dateTimeChanged = false;
        if (input.dateTime != null) {
            const nextDateTime = new Date(input.dateTime);
            if (Number.isNaN(nextDateTime.getTime())) {
                throw new Error('adminBookingRequestUpdate: invalid dateTime');
            }
            if (nextDateTime.getTime() !== bookingRequest.dateTime.getTime()) {
                dateTimeChanged = true;
                requestPatch.dateTime = nextDateTime;
                if (input.expiresAt == null) {
                    requestPatch.expiresAt = bookingRequestExpiresAt(nextDateTime);
                }
            }
        }

        if (input.expiresAt !== undefined) {
            if (input.expiresAt === null) {
                requestPatch.expiresAt = null;
            } else {
                const nextExpiresAt = new Date(input.expiresAt);
                if (Number.isNaN(nextExpiresAt.getTime())) {
                    throw new Error('adminBookingRequestUpdate: invalid expiresAt');
                }
                requestPatch.expiresAt = nextExpiresAt;
            }
        }

        if (input.originalMessage != null) {
            const nextMessage = textNormalizeProseTitled(input.originalMessage);
            if (nextMessage.length === 0) {
                throw new Error('adminBookingRequestUpdate: originalMessage must not be empty');
            }
            if (nextMessage !== bookingRequest.originalMessage) {
                requestPatch.originalMessage = nextMessage;
            }
        }

        if (input.adjustedMessage !== undefined) {
            const nextAdjusted =
                input.adjustedMessage == null || textNormalizeProse(input.adjustedMessage).length === 0
                    ? null
                    : textNormalizeProseTitled(input.adjustedMessage);
            if (nextAdjusted !== bookingRequest.adjustedMessage) {
                requestPatch.adjustedMessage = nextAdjusted;
            }
        }

        if (input.priceClassType != null && input.priceClassType !== bookingRequest.priceClassType) {
            requestPatch.priceClassType = input.priceClassType;
        }

        if (input.createdAt != null) {
            const nextCreatedAt = new Date(input.createdAt);
            if (Number.isNaN(nextCreatedAt.getTime())) {
                throw new Error('adminBookingRequestUpdate: invalid createdAt');
            }
            if (nextCreatedAt.getTime() !== bookingRequest.createdAt.getTime()) {
                requestPatch.createdAt = nextCreatedAt;
            }
        }

        let eventAddressChanged = false;
        if (input.exactEventAddress != null) {
            const nextAddress = exactEventAddressNormalize(input.exactEventAddress);
            const previous = bookingRequest.exactEventAddress;
            eventAddressChanged =
                previous.latitude !== nextAddress.latitude ||
                previous.longitude !== nextAddress.longitude ||
                previous.addressLine1 !== nextAddress.addressLine1 ||
                previous.city !== nextAddress.city ||
                previous.postCode !== nextAddress.postCode;
            requestPatch.exactEventAddress = nextAddress;
        }

        const offers = await serverRuntime.db
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestId, bookingRequestId));

        let resetCookAcceptance = false;
        let participantInserts:
            | {
                  bookingRequestParticipantId: string;
                  bookingRequestId: string;
                  type: BookingRequestParticipantType;
                  name: string;
                  restrictions: string[];
              }[]
            | null = null;
        const eventInserts: {
            bookingRequestOfferEventId: string;
            bookingRequestOfferId: string;
            type: 'USER_PARTICIPANTS_UPDATED' | 'USER_RESTRICTIONS_UPDATED';
            payload: Record<string, unknown>;
        }[] = [];

        if (input.participants != null) {
            const participants = await bookingRequestParticipantsPrepareForWrite(
                input.participants,
                serverRuntime,
                'adminBookingRequestUpdate',
                bookingRequest.userId,
            );
            const existingParticipants = await serverRuntime.db
                .select()
                .from(bookingRequestParticipants)
                .where(eq(bookingRequestParticipants.bookingRequestId, bookingRequestId));

            const adultsBefore = existingParticipants.filter((participant) => participant.type === 'ADULT').length;
            const discountedBefore = existingParticipants.filter((participant) => participant.type === 'DISCOUNTED').length;
            const adultsAfter = participants.filter((participant) => participant.type === 'ADULT').length;
            const discountedAfter = participants.filter((participant) => participant.type === 'DISCOUNTED').length;
            const countsUnchanged = adultsBefore === adultsAfter && discountedBefore === discountedAfter;

            const participantsChanged =
                !countsUnchanged ||
                existingParticipants.length !== participants.length ||
                existingParticipants.some((participant, index) => {
                    const next = participants[index];
                    return (
                        next == null ||
                        participant.type !== next.type ||
                        participant.name !== next.name ||
                        !preferencesEqual(participant.restrictions, next.restrictions)
                    );
                });

            if (participantsChanged) {
                resetCookAcceptance = true;
                participantInserts = participants.map((participant) => ({
                    bookingRequestParticipantId: idCreate(),
                    bookingRequestId,
                    type: participant.type,
                    name: participant.name,
                    restrictions: participant.restrictions,
                }));

                for (const offer of offers) {
                    eventInserts.push(
                        countsUnchanged
                            ? {
                                  bookingRequestOfferEventId: idCreate(),
                                  bookingRequestOfferId: offer.bookingRequestOfferId,
                                  type: 'USER_RESTRICTIONS_UPDATED',
                                  payload: {},
                              }
                            : {
                                  bookingRequestOfferEventId: idCreate(),
                                  bookingRequestOfferId: offer.bookingRequestOfferId,
                                  type: 'USER_PARTICIPANTS_UPDATED',
                                  payload: {
                                      participantsAdultBefore: adultsBefore,
                                      participantsDiscountedBefore: discountedBefore,
                                      participantsAdultAfter: adultsAfter,
                                      participantsDiscountedAfter: discountedAfter,
                                  },
                              },
                    );
                }
            }
        }

        if (Object.keys(requestPatch).length === 0 && participantInserts == null && eventInserts.length === 0) {
            return { success: true, referenceId: bookingRequestId };
        }

        await serverRuntime.db.transaction(async (transaction) => {
            if (Object.keys(requestPatch).length > 0) {
                await transaction.update(bookingRequests).set(requestPatch).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
            }

            if (participantInserts != null) {
                await transaction
                    .delete(bookingRequestParticipants)
                    .where(eq(bookingRequestParticipants.bookingRequestId, bookingRequestId));
                await transaction.insert(bookingRequestParticipants).values(participantInserts);
            }

            if (resetCookAcceptance && offers.length > 0) {
                await transaction
                    .update(bookingRequestOffers)
                    .set({
                        cookAccepted: null,
                        cookUnreadNotificationCount: sql`${bookingRequestOffers.cookUnreadNotificationCount} + 1`,
                    })
                    .where(eq(bookingRequestOffers.bookingRequestId, bookingRequestId));
            }

            if (eventInserts.length > 0) {
                await transaction.insert(bookingRequestOfferEvents).values(
                    eventInserts.map((event) => ({
                        bookingRequestOfferEventId: event.bookingRequestOfferEventId,
                        bookingRequestOfferId: event.bookingRequestOfferId,
                        type: event.type,
                        payload: event.payload as never,
                    })),
                );
            }
        });

        if (eventAddressChanged) {
            await bookingRequestCookTravelDistanceKmClear(serverRuntime, { bookingRequestId });
        }

        if (dateTimeChanged && requestPatch.dateTime) {
            const newDateTime = requestPatch.dateTime;
            const paidOffers = offers.filter(
                (offer) =>
                    offer.userAccepted === true && offer.cookAccepted === true && bookingRequestOfferPaymentIsPaid(offer.paymentStatus),
            );
            await Promise.all(
                paidOffers.flatMap((offer) => [
                    scheduleTestimonialReminderJobs(serverRuntime, {
                        bookingRequestOfferId: offer.bookingRequestOfferId,
                        eventDate: newDateTime,
                    }),
                    bookingRequestOfferEventTomorrowNotifySchedule(serverRuntime, {
                        bookingRequestId,
                        bookingRequestOfferId: offer.bookingRequestOfferId,
                        eventDate: newDateTime,
                    }),
                ]),
            );
        }

        if (requestPatch.expiresAt !== undefined) {
            await bookingRequestExpireNotifySchedule(serverRuntime, {
                bookingRequestId,
                expiresAt: requestPatch.expiresAt,
            });
        }

        if (requestPatch.createdAt) {
            await bookingRequestNoOffersNotifySchedule(serverRuntime, {
                bookingRequestId,
                createdAt: requestPatch.createdAt,
            });
        }

        const originalMessageChanged = requestPatch.originalMessage !== undefined;
        const resultingAdjustedMessage =
            requestPatch.adjustedMessage !== undefined ? requestPatch.adjustedMessage : bookingRequest.adjustedMessage;
        if (originalMessageChanged && resultingAdjustedMessage == null) {
            await bookingRequestAdjustedMessageGenerateScheduleIfEnabled(serverRuntime, {
                bookingRequestId,
                userId: bookingRequest.userId,
                originalMessage: requestPatch.originalMessage ?? bookingRequest.originalMessage,
            });
        }

        const cookUserIds = [...new Set(offers.map((offer) => offer.cookId))];
        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: bookingRequest.userId }),
            ...cookUserIds.map((cookId) => serverRuntime.publish.userUpdates({ userId: cookId })),
            serverRuntime.publish.adminUpdates(),
        ]);

        if (resetCookAcceptance && cookUserIds.length > 0) {
            await userBookingRequestUpdateEmailSend(serverRuntime, {
                bookingRequestId,
                customerUserId: bookingRequest.userId,
                cookIds: cookUserIds,
                offerIdsByCookId: new Map(offers.map((offer) => [offer.cookId, offer.bookingRequestOfferId])),
            });
        }

        return { success: true, referenceId: bookingRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
