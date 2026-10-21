import { and, eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { textNormalizeSingleLine, textNormalizeTitled } from '../../shared/textNormalize';
import {
    bookingRequestOfferEvents,
    bookingRequestOffers,
    bookingRequestParticipants,
    bookingRequests,
    cooks,
    giftCards,
    promoCodes,
    users,
} from '../db/schema';
import type { BookingRequestExactEventAddress, BookingRequestOfferParticipantAmendment } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestOfferParticipantAmendmentCreateArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { bookingRequestOfferParticipantAmendmentCreateEmailSend } from '../utils/bookingRequestLifecycleEmails';
import { bookingRequestOfferCanRequestParticipantAmendment } from '../utils/bookingRequestOfferParticipantAmendmentGates';
import { bookingRequestOfferParticipantAmendmentPriceCalculate } from '../utils/bookingRequestOfferParticipantAmendmentPrice';
import { bookingRequestParticipantsPrepareForWrite } from '../utils/bookingRequestParticipantsPrepareForWrite';
import { emailAddressPresent } from '../utils/emailAddressPresent';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { travelDistanceKmResolve } from '../utils/travelDistanceKmResolve';

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
    input: NonNullable<GqlSUserMutationBookingRequestOfferParticipantAmendmentCreateArgs['exactEventAddress']>,
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
        throw new Error('userBookingRequestOfferParticipantAmendmentCreate: exactEventAddress is incomplete');
    }
    return address;
}

export async function userBookingRequestOfferParticipantAmendmentCreate(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestOfferParticipantAmendmentCreateArgs,
    _requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const { bookingRequestOfferId } = args;

    try {
        const enabled = await featureToggleIsEnabled('BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT', serverRuntime, userId);
        if (!enabled) {
            throw new Error('userBookingRequestOfferParticipantAmendmentCreate: feature is disabled');
        }

        if (args.participants == null && args.exactEventAddress == null) {
            throw new Error('userBookingRequestOfferParticipantAmendmentCreate: participants or exactEventAddress required');
        }

        const [row] = await serverRuntime.db
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
            .limit(1);

        if (!row) {
            throw new Error('userBookingRequestOfferParticipantAmendmentCreate: offer not found');
        }

        if (
            !bookingRequestOfferCanRequestParticipantAmendment({
                offer: row.offer,
                bookingRequest: row.bookingRequest,
            })
        ) {
            throw new Error('userBookingRequestOfferParticipantAmendmentCreate: amendment is not allowed');
        }

        const existingParticipants = await serverRuntime.db
            .select()
            .from(bookingRequestParticipants)
            .where(eq(bookingRequestParticipants.bookingRequestId, row.bookingRequest.bookingRequestId));

        let participantsAfter = existingParticipants.map((participant) => ({
            type: participant.type,
            name: participant.name,
            restrictions: participant.restrictions,
        }));
        let participantsChanged = false;

        if (args.participants != null) {
            const prepared = await bookingRequestParticipantsPrepareForWrite(
                args.participants,
                serverRuntime,
                'userBookingRequestOfferParticipantAmendmentCreate',
                userId,
            );
            const adultsBefore = existingParticipants.filter((p) => p.type === 'ADULT').length;
            const discountedBefore = existingParticipants.filter((p) => p.type === 'DISCOUNTED').length;
            const adultsAfter = prepared.filter((p) => p.type === 'ADULT').length;
            const discountedAfter = prepared.filter((p) => p.type === 'DISCOUNTED').length;
            if (adultsBefore === adultsAfter && discountedBefore === discountedAfter) {
                if (args.exactEventAddress == null) {
                    throw new Error('userBookingRequestOfferParticipantAmendmentCreate: participant counts unchanged');
                }
            } else {
                participantsChanged = true;
                participantsAfter = prepared.map((participant) => ({
                    type: participant.type,
                    name: participant.name,
                    restrictions: participant.restrictions,
                }));
            }
        }

        let nextAddress: BookingRequestExactEventAddress | null = null;
        let travelExpensesCentsAfter = row.offer.travelExpensesCents;
        let travelDistanceKmAfter = row.offer.travelDistanceKm ?? null;

        if (args.exactEventAddress != null) {
            nextAddress = exactEventAddressNormalize(args.exactEventAddress);
            if (exactEventAddressEqual(row.bookingRequest.exactEventAddress, nextAddress)) {
                nextAddress = null;
            } else {
                const origin = row.cook.exactTravelOriginAddress;
                if (origin) {
                    travelDistanceKmAfter = await travelDistanceKmResolve(
                        serverRuntime.places,
                        { latitude: origin.latitude, longitude: origin.longitude },
                        { latitude: nextAddress.latitude, longitude: nextAddress.longitude },
                    );
                    travelExpensesCentsAfter = Math.round(travelDistanceKmAfter * row.cook.travelExpensesAmount * 2);
                }
            }
        }

        if (!participantsChanged && nextAddress == null) {
            throw new Error('userBookingRequestOfferParticipantAmendmentCreate: no material change');
        }

        const adultsBefore = existingParticipants.filter((p) => p.type === 'ADULT').length;
        const discountedBefore = existingParticipants.filter((p) => p.type === 'DISCOUNTED').length;
        const adultsAfter = participantsAfter.filter((p) => p.type === 'ADULT').length;
        const discountedAfter = participantsAfter.filter((p) => p.type === 'DISCOUNTED').length;

        const totalCentsCustomerBefore = row.offer.totalCentsCustomer ?? row.offer.totalWithoutDiscountsCentsCustomer;
        const pricePreview = bookingRequestOfferParticipantAmendmentPriceCalculate(
            {
                menuPriceCentsBefore: row.offer.menuPriceCents,
                travelExpensesCentsAfter,
                totalWithoutDiscountsCentsCustomerBefore: row.offer.totalWithoutDiscountsCentsCustomer,
                totalCentsCustomerBefore,
                giftCardAppliedCentsBefore: row.offer.giftCardAppliedCents,
                giftCardBalanceCents: row.giftCard?.balanceCents ?? 0,
                promoAmountCents: row.promoCode?.amountCents ?? 0,
                participantsBefore: existingParticipants,
                participantsAfter,
                scaleMenuByParticipants: participantsChanged,
            },
            row.offer.payoutCentsCook,
        );

        const amendment: BookingRequestOfferParticipantAmendment = {
            amendmentApplyId: idCreate(),
            requestedAt: new Date().toISOString(),
            ...(participantsChanged ? { participants: participantsAfter } : {}),
            ...(nextAddress ? { exactEventAddress: nextAddress } : {}),
            menuPriceCentsBefore: row.offer.menuPriceCents,
            travelExpensesCentsBefore: row.offer.travelExpensesCents,
            totalCentsCustomerBefore,
            payoutCentsCookBefore: row.offer.payoutCentsCook,
        };

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(bookingRequestOffers)
                .set({
                    participantAmendment: amendment,
                    cookUnreadNotificationCount: row.offer.cookUnreadNotificationCount + 1,
                })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId,
                type: 'USER_PARTICIPANT_AMENDMENT_REQUESTED',
                payload: {
                    participantsAdultBefore: adultsBefore,
                    participantsDiscountedBefore: discountedBefore,
                    participantsAdultAfter: adultsAfter,
                    participantsDiscountedAfter: discountedAfter,
                    ...(nextAddress
                        ? {
                              locationBefore: row.bookingRequest.exactEventAddress,
                              locationAfter: nextAddress,
                          }
                        : {}),
                    menuPriceCentsBefore: row.offer.menuPriceCents,
                    menuPriceCentsAfter: pricePreview.menuPriceCentsAfter,
                    travelExpensesCentsBefore: row.offer.travelExpensesCents,
                    travelExpensesCentsAfter: pricePreview.travelExpensesCents,
                    totalCentsCustomerBefore,
                    totalCentsCustomerAfter: pricePreview.totalCentsCustomerAfter,
                    payoutCentsCookBefore: row.offer.payoutCentsCook,
                    payoutCentsCookAfter: pricePreview.payoutCentsCookAfter,
                    giftCardDeltaCents: pricePreview.giftCardDeltaCents,
                },
            });
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId }),
            serverRuntime.publish.userUpdates({ userId: row.cook.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        const [[customerRow], [cookRow]] = await Promise.all([
            serverRuntime.db.select().from(users).where(eq(users.userId, userId)).limit(1),
            serverRuntime.db.select().from(users).where(eq(users.userId, row.cook.cookId)).limit(1),
        ]);
        const customer = customerRow ? emailAddressPresent(customerRow) : null;
        const cook = cookRow ? emailAddressPresent(cookRow) : null;

        if (customer && cook) {
            await bookingRequestOfferParticipantAmendmentCreateEmailSend(serverRuntime, {
                bookingRequest: row.bookingRequest,
                offer: row.offer,
                customer,
                cook,
            });
        }

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error);
        return { success: false };
    }
}
