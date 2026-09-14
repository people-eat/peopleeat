import { and, eq } from 'drizzle-orm';

import type { GiftCard, PromoCode } from '../db/schema';
import { bookingRequestOffers, bookingRequests, giftCards, promoCodes, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

function acceptedOfferConditions(bookingRequestId: string) {
    return and(
        eq(bookingRequestOffers.bookingRequestId, bookingRequestId),
        eq(bookingRequestOffers.cookAccepted, true),
        eq(bookingRequestOffers.userAccepted, true),
    );
}

type BookingRequestDiscountUpdateStatus = 'SUCCEEDED' | 'FAILED' | 'EXPIRED' | 'BALANCE_EMPTY';

interface BookingRequestDiscountUpdate {
    giftCardId: string | null;
    promoCodeId: string | null;
}

interface BookingRequestDiscountUpdateResult {
    update: BookingRequestDiscountUpdate;
    status: BookingRequestDiscountUpdateStatus;
}

async function applyPromoCode(
    serverRuntime: ServerRuntime,
    userId: string,
    bookingRequestId: string,
    promoCode: PromoCode,
): Promise<BookingRequestDiscountUpdateResult> {
    if (new Date(promoCode.expiresAt) <= new Date()) {
        return {
            status: 'EXPIRED',
            update: { giftCardId: null, promoCodeId: null },
        };
    }

    // Scoped promo codes can only be applied to their intended booking request.
    if (promoCode.bookingRequestId && promoCode.bookingRequestId !== bookingRequestId) {
        return {
            status: 'FAILED',
            update: { giftCardId: null, promoCodeId: null },
        };
    }

    const [bookingRequestWithPromoCode] = await serverRuntime.db
        .select()
        .from(bookingRequests)
        .where(and(eq(bookingRequests.promoCodeId, promoCode.promoCodeId), eq(bookingRequests.userId, userId)));

    if (bookingRequestWithPromoCode) {
        const [acceptedOffer] = await serverRuntime.db
            .select()
            .from(bookingRequestOffers)
            .where(acceptedOfferConditions(bookingRequestWithPromoCode.bookingRequestId));

        if (acceptedOffer) {
            return {
                status: 'FAILED',
                update: { giftCardId: null, promoCodeId: null },
            };
        }

        await serverRuntime.db
            .update(bookingRequests)
            .set({ promoCodeId: null, giftCardId: null })
            .where(eq(bookingRequests.bookingRequestId, bookingRequestWithPromoCode.bookingRequestId));
    }

    return {
        status: 'SUCCEEDED',
        update: { giftCardId: null, promoCodeId: promoCode.promoCodeId },
    };
}

function applyGiftCard(giftCard: GiftCard): BookingRequestDiscountUpdateResult {
    if (new Date(giftCard.expiresAt) <= new Date()) {
        return {
            status: 'EXPIRED',
            update: { giftCardId: null, promoCodeId: null },
        };
    }

    if (giftCard.balanceCents <= 0) {
        return {
            status: 'BALANCE_EMPTY',
            update: { giftCardId: null, promoCodeId: null },
        };
    }

    return {
        status: 'SUCCEEDED',
        update: { giftCardId: giftCard.giftCardId, promoCodeId: null },
    };
}

/**
 * Apply a promo or gift-card redeem code to a booking request owned by `userId`.
 * Returns false when the code is invalid, expired, scoped to another request,
 * or the target request already has a dual-accepted offer.
 */
export async function applyDiscountToBookingRequest(
    serverRuntime: ServerRuntime,
    userId: string,
    bookingRequestId: string,
    redeemCode: string,
): Promise<boolean> {
    const [row] = await serverRuntime.db
        .select({
            user: users,
            bookingRequest: bookingRequests,
            acceptedOffer: bookingRequestOffers,
            giftCard: giftCards,
            promoCode: promoCodes,
        })
        .from(users)
        .leftJoin(bookingRequests, and(eq(bookingRequests.bookingRequestId, bookingRequestId), eq(bookingRequests.userId, userId)))
        .leftJoin(bookingRequestOffers, acceptedOfferConditions(bookingRequestId))
        .leftJoin(giftCards, and(eq(giftCards.redeemCode, redeemCode), eq(giftCards.paymentStatus, 'PAYED')))
        .leftJoin(promoCodes, eq(promoCodes.redeemCode, redeemCode))
        .where(eq(users.userId, userId));

    if (!row?.user || !row.bookingRequest || row.acceptedOffer) {
        return false;
    }

    let result: BookingRequestDiscountUpdateResult | undefined;

    if (row.promoCode) {
        result = await applyPromoCode(serverRuntime, userId, bookingRequestId, row.promoCode);
    } else if (row.giftCard) {
        result = applyGiftCard(row.giftCard);
    } else {
        return false;
    }

    if (result.status !== 'SUCCEEDED') {
        return false;
    }

    await serverRuntime.db
        .update(bookingRequests)
        .set(result.update)
        .where(and(eq(bookingRequests.bookingRequestId, bookingRequestId), eq(bookingRequests.userId, userId)));

    return true;
}

/** Clear both discount FKs on an owned booking request (no accepted-offer check). */
export async function clearDiscountOnBookingRequest(
    serverRuntime: ServerRuntime,
    userId: string,
    bookingRequestId: string,
): Promise<boolean> {
    const [bookingRequest] = await serverRuntime.db
        .select()
        .from(bookingRequests)
        .where(and(eq(bookingRequests.bookingRequestId, bookingRequestId), eq(bookingRequests.userId, userId)))
        .limit(1);

    if (!bookingRequest) {
        return false;
    }

    const [acceptedOffer] = await serverRuntime.db.select().from(bookingRequestOffers).where(acceptedOfferConditions(bookingRequestId));

    if (acceptedOffer) {
        return false;
    }

    await serverRuntime.db
        .update(bookingRequests)
        .set({ giftCardId: null, promoCodeId: null })
        .where(and(eq(bookingRequests.bookingRequestId, bookingRequestId), eq(bookingRequests.userId, userId)));

    return true;
}
