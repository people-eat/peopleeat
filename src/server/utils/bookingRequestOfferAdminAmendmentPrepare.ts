import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { textNormalizeSingleLine, textNormalizeTitled } from '../../shared/textNormalize';
import { bookingRequestOffers, bookingRequestParticipants, bookingRequests, cooks, giftCards, promoCodes, users } from '../db/schema';
import type { BookingRequest, BookingRequestOffer, BookingRequestParticipant, Cook, GiftCard, PromoCode, User } from '../db/schema';
import type { BookingRequestExactEventAddress, BookingRequestOfferParticipantAmendment } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import {
    bookingRequestOfferAmendmentBlockReason,
    bookingRequestOfferHasPendingDeltaPayment,
    bookingRequestOfferIsDualAccepted,
    bookingRequestOfferParticipantAmendmentPaymentAllowed,
} from './bookingRequestOfferParticipantAmendmentGates';
import type { BookingRequestOfferParticipantAmendmentPriceResult } from './bookingRequestOfferParticipantAmendmentPrice';
import { bookingRequestOfferParticipantAmendmentPriceCalculate } from './bookingRequestOfferParticipantAmendmentPrice';
import { bookingRequestParticipantsPrepareForWrite } from './bookingRequestParticipantsPrepareForWrite';
import { travelDistanceKmResolve } from './travelDistanceKmResolve';

type AdminAmendmentParticipantInput = {
    type: 'ADULT' | 'DISCOUNTED';
    name: string;
    restrictions: string[];
};

type AdminAmendmentAddressInput = {
    displayText: string;
    latitude: number;
    longitude: number;
    addressLine1: string;
    addressLine2: string;
    city: string;
    postCode: string;
    state: string;
    country: string;
};

export type BookingRequestOfferAdminAmendmentPrepareInput = {
    bookingRequestOfferId: string;
    participants?: AdminAmendmentParticipantInput[] | null;
    exactEventAddress?: AdminAmendmentAddressInput | null;
    menuPriceCents?: number | null;
    travelExpensesCents?: number | null;
    platformFeePercentCook?: number | null;
    platformFeePercentCustomer?: number | null;
    travelDistanceKm?: number | null;
    errorPrefix: string;
};

export type BookingRequestOfferAdminAmendmentPrepareResult = {
    offer: BookingRequestOffer;
    bookingRequest: BookingRequest;
    cook: Cook;
    customer: User;
    giftCard: GiftCard | null;
    promoCode: PromoCode | null;
    existingParticipants: BookingRequestParticipant[];
    amendment: BookingRequestOfferParticipantAmendment;
    travelDistanceKmAfter: number | null;
    travelExpensesCentsAfter: number;
    pricePreview: BookingRequestOfferParticipantAmendmentPriceResult;
    adultsBefore: number;
    discountedBefore: number;
    adultsAfter: number;
    discountedAfter: number;
    nextAddress: BookingRequestExactEventAddress | null;
};

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

function exactEventAddressNormalize(input: AdminAmendmentAddressInput): BookingRequestExactEventAddress {
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
        throw new Error('exactEventAddress is incomplete');
    }
    return address;
}

/**
 * Load dual-accepted offer context and build a pending amendment from admin
 * venue / participants / absolute menu-travel inputs. No feature toggle.
 */
export async function bookingRequestOfferAdminAmendmentPrepare(
    serverRuntime: ServerRuntime,
    input: BookingRequestOfferAdminAmendmentPrepareInput,
): Promise<BookingRequestOfferAdminAmendmentPrepareResult> {
    const { bookingRequestOfferId, errorPrefix } = input;

    if (
        input.participants == null &&
        input.exactEventAddress == null &&
        input.menuPriceCents == null &&
        input.travelExpensesCents == null &&
        input.platformFeePercentCook == null &&
        input.platformFeePercentCustomer == null
    ) {
        throw new Error(
            `${errorPrefix}: participants, exactEventAddress, menuPriceCents, travelExpensesCents, or platform fee percent required`,
        );
    }

    if (input.menuPriceCents != null && (!Number.isInteger(input.menuPriceCents) || input.menuPriceCents <= 0)) {
        throw new Error(`${errorPrefix}: menuPriceCents must be a positive integer`);
    }
    if (input.travelExpensesCents != null && (!Number.isInteger(input.travelExpensesCents) || input.travelExpensesCents < 0)) {
        throw new Error(`${errorPrefix}: travelExpensesCents must be a non-negative integer`);
    }
    if (
        input.platformFeePercentCook != null &&
        (!Number.isInteger(input.platformFeePercentCook) || input.platformFeePercentCook < 0 || input.platformFeePercentCook > 100)
    ) {
        throw new Error(`${errorPrefix}: platformFeePercentCook must be an integer from 0 to 100`);
    }
    if (
        input.platformFeePercentCustomer != null &&
        (!Number.isInteger(input.platformFeePercentCustomer) ||
            input.platformFeePercentCustomer < 0 ||
            input.platformFeePercentCustomer > 100)
    ) {
        throw new Error(`${errorPrefix}: platformFeePercentCustomer must be an integer from 0 to 100`);
    }

    const [row] = await serverRuntime.db
        .select({
            offer: bookingRequestOffers,
            bookingRequest: bookingRequests,
            cook: cooks,
            customer: users,
            giftCard: giftCards,
            promoCode: promoCodes,
        })
        .from(bookingRequestOffers)
        .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
        .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
        .innerJoin(users, eq(users.userId, bookingRequests.userId))
        .leftJoin(giftCards, eq(giftCards.giftCardId, bookingRequests.giftCardId))
        .leftJoin(promoCodes, eq(promoCodes.promoCodeId, bookingRequests.promoCodeId))
        .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
        .limit(1);

    if (!row) {
        throw new Error(`${errorPrefix}: offer not found`);
    }

    if (!bookingRequestOfferIsDualAccepted(row.offer)) {
        throw new Error(`${errorPrefix}: offer is not dual-accepted`);
    }
    if (!bookingRequestOfferParticipantAmendmentPaymentAllowed(row.offer.paymentStatus)) {
        throw new Error(`${errorPrefix}: payment status ${row.offer.paymentStatus} does not allow amendment (need EMPTY, SETUP, or PAYED)`);
    }
    if (bookingRequestOfferHasPendingDeltaPayment(row.offer.paymentData)) {
        throw new Error(`${errorPrefix}: unpaid pending delta payment must be completed first`);
    }

    const blockReason = bookingRequestOfferAmendmentBlockReason({
        offer: row.offer,
        bookingRequest: row.bookingRequest,
    });
    // Admins may replace an unclaimed pending proposal; claimed means Stripe apply is in flight / stuck.
    if (blockReason === 'PREPARATIONS_LOCKED') {
        throw new Error(`${errorPrefix}: preparations are locked; clear the prep lock on the offer first`);
    }
    if (blockReason === 'PENDING_AMENDMENT_CLAIMED') {
        throw new Error(`${errorPrefix}: a pending amendment is already claimed (apply in progress or stuck)`);
    }
    if (blockReason === 'EVENT_PAST') {
        throw new Error(`${errorPrefix}: event date is in the past`);
    }
    if (blockReason === 'CANCELED') {
        throw new Error(`${errorPrefix}: booking request is canceled`);
    }
    if (blockReason === 'PENDING_DELTA_PAYMENT') {
        throw new Error(`${errorPrefix}: unpaid pending delta payment must be completed first`);
    }
    // null / PENDING_AMENDMENT (replace) / already-thrown dual-accept & payment-status → continue

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

    if (input.participants != null) {
        const prepared = await bookingRequestParticipantsPrepareForWrite(
            input.participants,
            serverRuntime,
            errorPrefix,
            row.customer.userId,
        );
        const adultsBefore = existingParticipants.filter((p) => p.type === 'ADULT').length;
        const discountedBefore = existingParticipants.filter((p) => p.type === 'DISCOUNTED').length;
        const adultsAfter = prepared.filter((p) => p.type === 'ADULT').length;
        const discountedAfter = prepared.filter((p) => p.type === 'DISCOUNTED').length;
        const countsUnchanged = adultsBefore === adultsAfter && discountedBefore === discountedAfter;
        if (!countsUnchanged) {
            participantsChanged = true;
            participantsAfter = prepared.map((participant) => ({
                type: participant.type,
                name: participant.name,
                restrictions: participant.restrictions,
            }));
        } else if (
            input.exactEventAddress == null &&
            input.menuPriceCents == null &&
            input.travelExpensesCents == null &&
            input.platformFeePercentCook == null &&
            input.platformFeePercentCustomer == null
        ) {
            throw new Error(`${errorPrefix}: participant counts unchanged`);
        }
    }

    let nextAddress: BookingRequestExactEventAddress | null = null;
    let travelExpensesCentsAfter = row.offer.travelExpensesCents;
    let travelDistanceKmAfter = row.offer.travelDistanceKm ?? null;

    if (input.exactEventAddress != null) {
        const normalized = exactEventAddressNormalize(input.exactEventAddress);
        if (!exactEventAddressEqual(row.bookingRequest.exactEventAddress, normalized)) {
            nextAddress = normalized;
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

    const menuOverride =
        input.menuPriceCents != null && input.menuPriceCents !== row.offer.menuPriceCents ? input.menuPriceCents : undefined;
    const travelOverride =
        input.travelExpensesCents != null && input.travelExpensesCents !== row.offer.travelExpensesCents
            ? input.travelExpensesCents
            : undefined;
    const platformFeePercentCookAfter =
        input.platformFeePercentCook != null && input.platformFeePercentCook !== row.offer.platformFeePercentCook
            ? input.platformFeePercentCook
            : undefined;
    const platformFeePercentCustomerAfter =
        input.platformFeePercentCustomer != null && input.platformFeePercentCustomer !== row.offer.platformFeePercentCustomer
            ? input.platformFeePercentCustomer
            : undefined;

    if (travelOverride != null) {
        travelExpensesCentsAfter = travelOverride;
        if (input.travelDistanceKm !== undefined) {
            travelDistanceKmAfter = input.travelDistanceKm;
        }
    }

    if (
        !participantsChanged &&
        nextAddress == null &&
        menuOverride == null &&
        travelOverride == null &&
        platformFeePercentCookAfter == null &&
        platformFeePercentCustomerAfter == null
    ) {
        throw new Error(`${errorPrefix}: no material change`);
    }

    const adultsBefore = existingParticipants.filter((p) => p.type === 'ADULT').length;
    const discountedBefore = existingParticipants.filter((p) => p.type === 'DISCOUNTED').length;
    const adultsAfter = participantsAfter.filter((p) => p.type === 'ADULT').length;
    const discountedAfter = participantsAfter.filter((p) => p.type === 'DISCOUNTED').length;

    const totalCentsCustomerBefore = row.offer.totalCentsCustomer ?? row.offer.totalWithoutDiscountsCentsCustomer;
    const platformFeePercentCook = platformFeePercentCookAfter ?? row.offer.platformFeePercentCook;
    const platformFeePercentCustomer = platformFeePercentCustomerAfter ?? row.offer.platformFeePercentCustomer;
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
            scaleMenuByParticipants: participantsChanged && menuOverride == null,
            menuPriceCentsOverride: menuOverride,
            platformFeePercentCook,
            platformFeePercentCustomer,
        },
        row.offer.payoutCentsCook,
    );

    const amendment: BookingRequestOfferParticipantAmendment = {
        amendmentApplyId: idCreate(),
        requestedAt: new Date().toISOString(),
        ...(participantsChanged ? { participants: participantsAfter } : {}),
        ...(nextAddress ? { exactEventAddress: nextAddress } : {}),
        ...(menuOverride != null ? { menuPriceCentsAfter: menuOverride } : {}),
        ...(travelOverride != null ? { travelExpensesCentsAfter: travelOverride } : {}),
        ...(platformFeePercentCookAfter != null ? { platformFeePercentCookAfter } : {}),
        ...(platformFeePercentCustomerAfter != null ? { platformFeePercentCustomerAfter } : {}),
        menuPriceCentsBefore: row.offer.menuPriceCents,
        travelExpensesCentsBefore: row.offer.travelExpensesCents,
        totalCentsCustomerBefore,
        payoutCentsCookBefore: row.offer.payoutCentsCook,
    };

    return {
        offer: row.offer,
        bookingRequest: row.bookingRequest,
        cook: row.cook,
        customer: row.customer,
        giftCard: row.giftCard,
        promoCode: row.promoCode,
        existingParticipants,
        amendment,
        travelDistanceKmAfter,
        travelExpensesCentsAfter,
        pricePreview,
        adultsBefore,
        discountedBefore,
        adultsAfter,
        discountedAfter,
        nextAddress,
    };
}
