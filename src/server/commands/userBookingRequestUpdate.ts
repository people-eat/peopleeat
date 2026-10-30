import { eq, sql } from 'drizzle-orm';

import {
    bookingRequestOfferMenuPriceScaleByPaidParticipants,
    bookingRequestOfferPriceCalculate,
} from '../../shared/bookingRequestOfferPrice';
import { bookingRequestPaidParticipants } from '../../shared/bookingRequestOfferPriceGuidance';
import { idCreate } from '../../shared/idCreate';
import { textNormalizeSingleLine, textNormalizeTitled } from '../../shared/textNormalize';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequestParticipants, bookingRequests, cooks } from '../db/schema';
import type {
    BookingRequestExactEventAddress,
    BookingRequestOfferPriceAutoAdjustReason,
    BookingRequestParticipantType,
} from '../domain/bookingRequest';
import { bookingRequestOfferPaymentIsPaid, bookingRequestStatusDerive } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation, GqlSUserMutationBookingRequestUpdateArgs } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackFormatDateTime, slackFormatParticipants } from '../slack/slackFormat';
import { slackNotifyBookingRequestFieldChange } from '../slack/slackNotifyBooking';
import { bookingRequestCookTravelDistanceKmClear } from '../utils/bookingRequestCookTravelDistanceKmEnsure';
import { bookingRequestExpireNotifySchedule } from '../utils/bookingRequestExpireNotifySchedule';
import { bookingRequestExpiresAt } from '../utils/bookingRequestExpiresAt';
import { userBookingRequestUpdateEmailSend } from '../utils/bookingRequestLifecycleEmails';
import { bookingRequestOfferEventTomorrowNotifySchedule } from '../utils/bookingRequestOfferEventTomorrowNotifySchedule';
import { bookingRequestOfferPriceSnapshot } from '../utils/bookingRequestOfferPriceSnapshot';
import { bookingRequestParticipantsPrepareForWrite } from '../utils/bookingRequestParticipantsPrepareForWrite';
import { bookingRequestPoolCooksPublish } from '../utils/bookingRequestPoolCooksPublish';
import { scheduleTestimonialReminderJobs } from '../utils/scheduleTestimonialReminderJobs';
import { travelDistanceKmResolve } from '../utils/travelDistanceKmResolve';
import { userBookingRequestOwnedFindOne } from '../utils/userBookingRequestOwnedFindOne';

const UPDATABLE_STATUSES = new Set(['WAITING_FOR_OFFERS', 'OFFERS_WAITING_FOR_REVIEW']);

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
    input: NonNullable<GqlSUserMutationBookingRequestUpdateArgs['exactEventAddress']>,
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
        throw new Error('userBookingRequestUpdate: exactEventAddress is incomplete');
    }
    return address;
}

export async function userBookingRequestUpdate(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const { bookingRequestId, occasion, dateTime, preferences, exactEventAddress: exactEventAddressArg } = args;

    try {
        const bookingRequest = await userBookingRequestOwnedFindOne(serverRuntime, userId, bookingRequestId);
        if (!bookingRequest) {
            throw new Error('userBookingRequestUpdate: booking request not found');
        }

        const offers = await serverRuntime.db
            .select({ offer: bookingRequestOffers, cook: cooks })
            .from(bookingRequestOffers)
            .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
            .where(eq(bookingRequestOffers.bookingRequestId, bookingRequestId));

        const accepted = offers.find((row) => row.offer.userAccepted === true && row.offer.cookAccepted === true);
        const status = bookingRequestStatusDerive({
            offerCount: offers.length,
            acceptedOfferPaymentStatus: accepted?.offer.paymentStatus ?? null,
            canceledAt: bookingRequest.canceledAt,
            expiresAt: bookingRequest.expiresAt,
            eventDate: bookingRequest.dateTime,
        });

        if (!UPDATABLE_STATUSES.has(status)) {
            throw new Error('userBookingRequestUpdate: booking request is not updatable');
        }

        const participants = await bookingRequestParticipantsPrepareForWrite(
            args.participants,
            serverRuntime,
            'userBookingRequestUpdate',
            userId,
        );

        const existingParticipants = await serverRuntime.db
            .select()
            .from(bookingRequestParticipants)
            .where(eq(bookingRequestParticipants.bookingRequestId, bookingRequestId));

        const requestPatch: {
            occasion?: string;
            dateTime?: Date;
            expiresAt?: Date;
            preferences?: string[];
            exactEventAddress?: BookingRequestExactEventAddress;
        } = {};

        type OfferEventInsert = {
            bookingRequestOfferEventId: string;
            bookingRequestOfferId: string;
            type:
                | 'USER_PARTICIPANTS_UPDATED'
                | 'USER_RESTRICTIONS_UPDATED'
                | 'USER_DATE_UPDATED'
                | 'USER_TIME_UPDATED'
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

        if (occasion != null) {
            const nextOccasion = textNormalizeTitled(occasion);
            if (nextOccasion.length === 0) {
                throw new Error('userBookingRequestUpdate: occasion must not be empty');
            }
            if (nextOccasion !== bookingRequest.occasion) {
                requestPatch.occasion = nextOccasion;
            }
        }

        if (dateTime != null) {
            const nextDateTime = new Date(dateTime);
            if (Number.isNaN(nextDateTime.getTime())) {
                throw new Error('userBookingRequestUpdate: invalid dateTime');
            }
            if (nextDateTime.getTime() !== bookingRequest.dateTime.getTime()) {
                resetCookAcceptance = true;
                requestPatch.dateTime = nextDateTime;
                requestPatch.expiresAt = bookingRequestExpiresAt(nextDateTime);

                const sameUtcDay =
                    nextDateTime.getUTCFullYear() === bookingRequest.dateTime.getUTCFullYear() &&
                    nextDateTime.getUTCMonth() === bookingRequest.dateTime.getUTCMonth() &&
                    nextDateTime.getUTCDate() === bookingRequest.dateTime.getUTCDate();

                for (const { offer } of offers) {
                    eventInserts.push({
                        bookingRequestOfferEventId: idCreate(),
                        bookingRequestOfferId: offer.bookingRequestOfferId,
                        type: sameUtcDay ? 'USER_TIME_UPDATED' : 'USER_DATE_UPDATED',
                        payload: {
                            dateTimeBefore: bookingRequest.dateTime.toISOString(),
                            dateTimeAfter: nextDateTime.toISOString(),
                        },
                    });
                }
            }
        }

        if (preferences != null) {
            const nextPreferences = preferences
                .map((preference) => textNormalizeTitled(preference))
                .filter((preference) => preference.length > 0);
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

        if (exactEventAddressArg != null) {
            const nextAddress = exactEventAddressNormalize(exactEventAddressArg);
            if (!exactEventAddressEqual(bookingRequest.exactEventAddress, nextAddress)) {
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
        }

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

        let participantInserts:
            | {
                  bookingRequestParticipantId: string;
                  bookingRequestId: string;
                  type: BookingRequestParticipantType;
                  name: string;
                  restrictions: string[];
              }[]
            | null = null;

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

        // One SYSTEM_CHANGED_PRICE per offer whose money moved vs the pre-update snapshot.
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

        if (requestPatch.exactEventAddress != null) {
            await bookingRequestCookTravelDistanceKmClear(serverRuntime, { bookingRequestId });
        }

        if (requestPatch.dateTime) {
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

        const cookUserIds = [...new Set(offers.map((row) => row.offer.cookId))];
        const poolMembershipMayChange = requestPatch.exactEventAddress != null || requestPatch.expiresAt !== undefined;
        await Promise.all([
            serverRuntime.publish.userUpdates({ userId }),
            ...cookUserIds.map((cookId) => serverRuntime.publish.userUpdates({ userId: cookId })),
            serverRuntime.publish.adminUpdates(),
            poolMembershipMayChange
                ? bookingRequestPoolCooksPublish(serverRuntime, [bookingRequest, { ...bookingRequest, ...requestPatch }], cookUserIds)
                : undefined,
        ]);

        if (resetCookAcceptance && cookUserIds.length > 0) {
            await userBookingRequestUpdateEmailSend(serverRuntime, {
                bookingRequestId,
                customerUserId: userId,
                cookIds: cookUserIds,
                offerIdsByCookId: new Map(offers.map((row) => [row.offer.cookId, row.offer.bookingRequestOfferId])),
            });
        }

        const slackNotifies: Promise<void>[] = [];
        if (requestPatch.occasion) {
            slackNotifies.push(
                slackNotifyBookingRequestFieldChange(serverRuntime, {
                    bookingRequestId,
                    userId,
                    header: 'Anlass geändert',
                    before: bookingRequest.occasion,
                    after: requestPatch.occasion,
                }),
            );
        }
        if (requestPatch.dateTime) {
            slackNotifies.push(
                slackNotifyBookingRequestFieldChange(serverRuntime, {
                    bookingRequestId,
                    userId,
                    header: 'Datum/Uhrzeit geändert',
                    before: slackFormatDateTime(bookingRequest.dateTime),
                    after: slackFormatDateTime(requestPatch.dateTime),
                }),
            );
        }
        if (requestPatch.exactEventAddress) {
            slackNotifies.push(
                slackNotifyBookingRequestFieldChange(serverRuntime, {
                    bookingRequestId,
                    userId,
                    header: 'Standort geändert',
                    before: bookingRequest.exactEventAddress.displayText,
                    after: requestPatch.exactEventAddress.displayText,
                }),
            );
        }
        if (requestPatch.preferences) {
            slackNotifies.push(
                slackNotifyBookingRequestFieldChange(serverRuntime, {
                    bookingRequestId,
                    userId,
                    header: 'Präferenzen geändert',
                    before: bookingRequest.preferences.join(', ') || '—',
                    after: requestPatch.preferences.join(', ') || '—',
                }),
            );
        }
        if (participantsChanged) {
            slackNotifies.push(
                slackNotifyBookingRequestFieldChange(serverRuntime, {
                    bookingRequestId,
                    userId,
                    header: countsUnchanged ? 'Einschränkungen geändert' : 'Teilnehmer geändert',
                    before: slackFormatParticipants(adultsBefore, discountedBefore),
                    after: slackFormatParticipants(adultsAfter, discountedAfter),
                }),
            );
        }
        await Promise.all(slackNotifies);

        return { success: true, referenceId: bookingRequestId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
