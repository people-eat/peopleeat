import { eq, sql } from 'drizzle-orm';

import {
    bookingRequestOfferMenuPriceScaleByPaidParticipants,
    bookingRequestOfferPriceCalculate,
} from '../../shared/bookingRequestOfferPrice';
import { bookingRequestPaidParticipants } from '../../shared/bookingRequestOfferPriceGuidance';
import { idCreate } from '../../shared/idCreate';
import { textNormalizeProse, textNormalizeProseTitled, textNormalizeSingleLine, textNormalizeTitled } from '../../shared/textNormalize';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequestParticipants, bookingRequests, cooks } from '../db/schema';
import type {
    BookingRequestExactEventAddress,
    BookingRequestOfferPriceAutoAdjustReason,
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
import { bookingRequestOfferPriceSnapshot } from '../utils/bookingRequestOfferPriceSnapshot';
import { bookingRequestParticipantsPrepareForWrite } from '../utils/bookingRequestParticipantsPrepareForWrite';
import { scheduleTestimonialReminderJobs } from '../utils/scheduleTestimonialReminderJobs';
import { travelDistanceKmResolve } from '../utils/travelDistanceKmResolve';

function preferencesEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
}

function exactEventAddressEqual(a: BookingRequestExactEventAddress, b: BookingRequestExactEventAddress): boolean {
    return (
        a.displayText === b.displayText &&
        a.latitude === b.latitude &&
        a.longitude === b.longitude &&
        a.addressLine1 === b.addressLine1 &&
        a.addressLine2 === b.addressLine2 &&
        a.city === b.city &&
        a.postCode === b.postCode &&
        a.state === b.state &&
        a.country === b.country
    );
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

        const offers = await serverRuntime.db
            .select({ offer: bookingRequestOffers, cook: cooks })
            .from(bookingRequestOffers)
            .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
            .where(eq(bookingRequestOffers.bookingRequestId, bookingRequestId));

        const requestPatch: {
            occasion?: string;
            dateTime?: Date;
            expiresAt?: Date | null;
            originalMessage?: string;
            adjustedMessage?: string | null;
            priceClassType?: BookingRequestPriceClassType;
            createdAt?: Date;
            exactEventAddress?: BookingRequestExactEventAddress;
            preferences?: string[];
        } = {};

        type OfferEventInsert = {
            bookingRequestOfferEventId: string;
            bookingRequestOfferId: string;
            type:
                | 'USER_PARTICIPANTS_UPDATED'
                | 'USER_RESTRICTIONS_UPDATED'
                | 'USER_PREFERENCES_UPDATED'
                | 'USER_LOCATION_UPDATED'
                | 'SYSTEM_CHANGED_PRICE';
            payload: Record<string, unknown>;
        };

        type OfferPricePatch = {
            bookingRequestOfferId: string;
            travelDistanceKm: number | null;
            platformFeePercentCook: number;
            platformFeePercentCustomer: number;
            travelExpensesCents: number;
            menuPriceCents: number;
            paymentProviderFeeCents: number;
            platformFeeCentsCook: number;
            platformFeeCentsCustomer: number;
            payoutCentsCook: number;
            totalWithoutDiscountsCentsCustomer: number;
            priceAutoAdjustReason: BookingRequestOfferPriceAutoAdjustReason | null;
        };

        const eventInserts: OfferEventInsert[] = [];
        const offerPricePatchesById = new Map<string, OfferPricePatch>();
        const priceAutoAdjustReasonsById = new Map<string, Set<'PARTICIPANTS' | 'TRAVEL'>>();
        let resetCookAcceptance = false;

        function priceAutoAdjustReasonMerge(
            bookingRequestOfferId: string,
            reason: 'PARTICIPANTS' | 'TRAVEL',
        ): BookingRequestOfferPriceAutoAdjustReason {
            const reasons = priceAutoAdjustReasonsById.get(bookingRequestOfferId) ?? new Set();
            reasons.add(reason);
            priceAutoAdjustReasonsById.set(bookingRequestOfferId, reasons);
            if (reasons.has('PARTICIPANTS') && reasons.has('TRAVEL')) return 'PARTICIPANTS_AND_TRAVEL';
            if (reasons.has('PARTICIPANTS')) return 'PARTICIPANTS';
            return 'TRAVEL';
        }

        function offerPriceMoneyChanged(
            before: ReturnType<typeof bookingRequestOfferPriceSnapshot>,
            after: ReturnType<typeof bookingRequestOfferPriceSnapshot>,
        ): boolean {
            return (
                before.travelExpensesCents !== after.travelExpensesCents ||
                before.menuPriceCents !== after.menuPriceCents ||
                before.totalWithoutDiscountsCentsCustomer !== after.totalWithoutDiscountsCentsCustomer ||
                before.payoutCentsCook !== after.payoutCentsCook
            );
        }

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

        const nextAddress = input.exactEventAddress != null ? exactEventAddressNormalize(input.exactEventAddress) : null;
        const eventAddressChanged = nextAddress != null && !exactEventAddressEqual(bookingRequest.exactEventAddress, nextAddress);

        const dualAcceptedPaidOffer = offers.find(
            ({ offer }) =>
                offer.userAccepted === true &&
                offer.cookAccepted === true &&
                (offer.paymentStatus === 'EMPTY' ||
                    offer.paymentStatus === 'SETUP' ||
                    offer.paymentStatus === 'PAYED' ||
                    offer.paymentStatus === 'TRANSFERRED' ||
                    offer.paymentStatus === 'PAYED_OUT_OF_SYSTEM'),
        );
        if (dualAcceptedPaidOffer && (eventAddressChanged || input.participants != null)) {
            throw new Error(
                'adminBookingRequestUpdate: cannot change venue or participants on a dual-accepted paid offer; use the customer amendment flow or handover tools',
            );
        }

        if (eventAddressChanged) {
            resetCookAcceptance = true;
            requestPatch.exactEventAddress = nextAddress;

            for (const { offer, cook } of offers) {
                eventInserts.push({
                    bookingRequestOfferEventId: idCreate(),
                    bookingRequestOfferId: offer.bookingRequestOfferId,
                    type: 'USER_LOCATION_UPDATED',
                    payload: {
                        locationBefore: bookingRequest.exactEventAddress,
                        locationAfter: nextAddress,
                    },
                });

                const origin = cook.exactTravelOriginAddress;
                if (!origin) continue;

                const travelDistanceKm = await travelDistanceKmResolve(
                    serverRuntime.places,
                    { latitude: origin.latitude, longitude: origin.longitude },
                    { latitude: nextAddress.latitude, longitude: nextAddress.longitude },
                );
                const travelExpensesCents = Math.round(travelDistanceKm * cook.travelExpensesAmount * 2);
                const price = bookingRequestOfferPriceCalculate({
                    menuPriceCents: offer.menuPriceCents,
                    travelExpensesCents,
                    platformFeePercentCook: offer.platformFeePercentCook,
                    platformFeePercentCustomer: offer.platformFeePercentCustomer,
                });
                const priceBefore = bookingRequestOfferPriceSnapshot(offer);
                const priceAfter = bookingRequestOfferPriceSnapshot(price);

                if (offerPriceMoneyChanged(priceBefore, priceAfter)) {
                    const reason = priceAutoAdjustReasonMerge(offer.bookingRequestOfferId, 'TRAVEL');
                    offerPricePatchesById.set(offer.bookingRequestOfferId, {
                        bookingRequestOfferId: offer.bookingRequestOfferId,
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
                        priceAutoAdjustReason: reason,
                    });
                } else {
                    offerPricePatchesById.set(offer.bookingRequestOfferId, {
                        bookingRequestOfferId: offer.bookingRequestOfferId,
                        travelDistanceKm,
                        platformFeePercentCook: offer.platformFeePercentCook,
                        platformFeePercentCustomer: offer.platformFeePercentCustomer,
                        travelExpensesCents: offer.travelExpensesCents,
                        menuPriceCents: offer.menuPriceCents,
                        paymentProviderFeeCents: offer.paymentProviderFeeCents,
                        platformFeeCentsCook: offer.platformFeeCentsCook,
                        platformFeeCentsCustomer: offer.platformFeeCentsCustomer,
                        payoutCentsCook: offer.payoutCentsCook,
                        totalWithoutDiscountsCentsCustomer: offer.totalWithoutDiscountsCentsCustomer,
                        priceAutoAdjustReason: offer.priceAutoAdjustReason ?? null,
                    });
                }
            }
        }

        let participantInserts:
            | {
                  bookingRequestParticipantId: string;
                  bookingRequestId: string;
                  type: BookingRequestParticipantType;
                  name: string;
                  restrictions: string[];
              }[]
            | null = null;

        if (input.preferences != null) {
            const nextPreferences = input.preferences
                .map((preference) => textNormalizeTitled(preference))
                .filter((preference) => preference.length > 0)
                .slice(0, 4);
            if (!preferencesEqual(bookingRequest.preferences, nextPreferences)) {
                resetCookAcceptance = true;
                requestPatch.preferences = nextPreferences;
                for (const { offer } of offers) {
                    eventInserts.push({
                        bookingRequestOfferEventId: idCreate(),
                        bookingRequestOfferId: offer.bookingRequestOfferId,
                        type: 'USER_PREFERENCES_UPDATED',
                        payload: {
                            preferencesBefore: bookingRequest.preferences,
                            preferencesAfter: nextPreferences,
                        },
                    });
                }
            }
        }

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

                for (const { offer } of offers) {
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

                if (!countsUnchanged) {
                    const paidBefore = bookingRequestPaidParticipants(adultsBefore, discountedBefore);
                    const paidAfter = bookingRequestPaidParticipants(adultsAfter, discountedAfter);
                    if (paidBefore > 0 && paidAfter > 0) {
                        for (const { offer } of offers) {
                            const pending = offerPricePatchesById.get(offer.bookingRequestOfferId);
                            const menuPriceCentsBefore = pending?.menuPriceCents ?? offer.menuPriceCents;
                            const travelExpensesCents = pending?.travelExpensesCents ?? offer.travelExpensesCents;
                            const travelDistanceKm = pending?.travelDistanceKm ?? offer.travelDistanceKm ?? null;
                            const menuPriceCentsAfter = bookingRequestOfferMenuPriceScaleByPaidParticipants({
                                menuPriceCents: menuPriceCentsBefore,
                                paidParticipantsBefore: paidBefore,
                                paidParticipantsAfter: paidAfter,
                            });
                            const price = bookingRequestOfferPriceCalculate({
                                menuPriceCents: menuPriceCentsAfter,
                                travelExpensesCents,
                                platformFeePercentCook: offer.platformFeePercentCook,
                                platformFeePercentCustomer: offer.platformFeePercentCustomer,
                            });
                            const priceBefore = bookingRequestOfferPriceSnapshot(offer);
                            const priceAfter = bookingRequestOfferPriceSnapshot(price);
                            if (!offerPriceMoneyChanged(priceBefore, priceAfter) && pending == null) {
                                continue;
                            }
                            if (offerPriceMoneyChanged(priceBefore, priceAfter)) {
                                const reason = priceAutoAdjustReasonMerge(offer.bookingRequestOfferId, 'PARTICIPANTS');
                                offerPricePatchesById.set(offer.bookingRequestOfferId, {
                                    bookingRequestOfferId: offer.bookingRequestOfferId,
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
                                    priceAutoAdjustReason: reason,
                                });
                            } else if (pending != null) {
                                offerPricePatchesById.set(offer.bookingRequestOfferId, {
                                    ...pending,
                                    menuPriceCents: price.menuPriceCents,
                                    platformFeePercentCook: price.platformFeePercentCook,
                                    platformFeePercentCustomer: price.platformFeePercentCustomer,
                                    travelExpensesCents: price.travelExpensesCents,
                                    paymentProviderFeeCents: price.paymentProviderFeeCents,
                                    platformFeeCentsCook: price.platformFeeCentsCook,
                                    platformFeeCentsCustomer: price.platformFeeCentsCustomer,
                                    payoutCentsCook: price.payoutCentsCook,
                                    totalWithoutDiscountsCentsCustomer: price.totalWithoutDiscountsCentsCustomer,
                                });
                            }
                        }
                    }
                }
            }
        }

        for (const { offer } of offers) {
            const patch = offerPricePatchesById.get(offer.bookingRequestOfferId);
            if (patch == null || patch.priceAutoAdjustReason == null) continue;
            const priceBefore = bookingRequestOfferPriceSnapshot(offer);
            const priceAfter = bookingRequestOfferPriceSnapshot(patch);
            if (!offerPriceMoneyChanged(priceBefore, priceAfter)) continue;
            const alreadyEmitted = eventInserts.some(
                (event) => event.bookingRequestOfferId === offer.bookingRequestOfferId && event.type === 'SYSTEM_CHANGED_PRICE',
            );
            if (alreadyEmitted) continue;
            eventInserts.push({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId: offer.bookingRequestOfferId,
                type: 'SYSTEM_CHANGED_PRICE',
                payload: { priceBefore, priceAfter },
            });
        }

        const offerPricePatches = [...offerPricePatchesById.values()];

        if (
            Object.keys(requestPatch).length === 0 &&
            participantInserts == null &&
            eventInserts.length === 0 &&
            offerPricePatches.length === 0
        ) {
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

            for (const patch of offerPricePatches) {
                const { bookingRequestOfferId, ...setValues } = patch;
                await transaction
                    .update(bookingRequestOffers)
                    .set(setValues)
                    .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
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
                ({ offer }) =>
                    offer.userAccepted === true && offer.cookAccepted === true && bookingRequestOfferPaymentIsPaid(offer.paymentStatus),
            );
            await Promise.all(
                paidOffers.flatMap(({ offer }) => [
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

        const cookUserIds = [...new Set(offers.map(({ offer }) => offer.cookId))];
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
                offerIdsByCookId: new Map(offers.map(({ offer }) => [offer.cookId, offer.bookingRequestOfferId])),
            });
        }

        return { success: true, referenceId: bookingRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
