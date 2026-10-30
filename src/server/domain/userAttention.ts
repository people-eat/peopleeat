import type { UserAttentionKind } from '../../shared/attentionCopy';
import type { BookingRequestOfferStatus } from '../../shared/bookingRequestOfferStatus';
import type { BookingRequestStatus } from '../../shared/bookingRequestStatus';
import { cookCallSlotBookingNextStepIsBefore, cookCallSlotBookingNextStepPick } from '../../shared/cookCallSlotBookingStatus';
import type { CookCallSlotBookingNextStep } from '../../shared/cookCallSlotBookingStatus';

export type UserAttentionRequest = {
    bookingRequestId: string;
    status: BookingRequestStatus;
    occasion: string;
    dateTime: Date;
    offers: readonly {
        bookingRequestOfferId: string;
        status: BookingRequestOfferStatus;
        userUnreadNotificationCount: number;
        testimonialMissing: boolean;
        callBookings: readonly { startAt: Date; endAt: Date; status: string; initiator: string }[];
    }[];
};

export type UserAttentionItem = {
    kind: UserAttentionKind;
    count: number;
    bookingRequestId: string;
    bookingRequestOfferId: string | null;
    occasion: string;
    callStartAt: Date | null;
    callEndAt: Date | null;
};

const callStepKind: Record<CookCallSlotBookingNextStep, UserAttentionKind> = {
    RESPONSE_NEEDED: 'CALL_RESPONSE_NEEDED',
    PENDING: 'CALL_PENDING',
    CONFIRMED: 'CALL_CONFIRMED',
};

function byDateTimeAsc(a: UserAttentionRequest, b: UserAttentionRequest): number {
    return a.dateTime.getTime() - b.dateTime.getTime();
}

function item(
    kind: UserAttentionKind,
    request: UserAttentionRequest,
    overrides: Partial<Omit<UserAttentionItem, 'kind' | 'bookingRequestId' | 'occasion'>> = {},
): UserAttentionItem {
    return {
        kind,
        count: 1,
        bookingRequestId: request.bookingRequestId,
        bookingRequestOfferId: null,
        occasion: request.occasion,
        callStartAt: null,
        callEndAt: null,
        ...overrides,
    };
}

function callAttentionFind(requests: readonly UserAttentionRequest[]): UserAttentionItem | null {
    let fallback: UserAttentionItem | null = null;
    for (const request of requests) {
        let best: { offerId: string; startAt: Date; endAt: Date; step: CookCallSlotBookingNextStep } | null = null;
        for (const offer of request.offers) {
            const picked = cookCallSlotBookingNextStepPick(offer.callBookings, 'customer');
            if (picked && cookCallSlotBookingNextStepIsBefore(picked.step, best?.step ?? null)) {
                best = {
                    offerId: offer.bookingRequestOfferId,
                    startAt: picked.booking.startAt,
                    endAt: picked.booking.endAt,
                    step: picked.step,
                };
            }
        }
        if (!best) continue;
        const callItem = item(callStepKind[best.step], request, {
            bookingRequestOfferId: best.offerId,
            callStartAt: best.startAt,
            callEndAt: best.endAt,
        });
        if (best.step === 'RESPONSE_NEEDED') return callItem;
        fallback ??= callItem;
    }
    return fallback;
}

/**
 * Customer overview to-dos, highest priority first: offers to review → payment
 * due → unread offer chat → discovery call → missing review. `requests` must be
 * in the order the customer's request list uses (newest first); ties resolve
 * to the earlier entry.
 */
export function userAttentionDerive(requests: readonly UserAttentionRequest[]): UserAttentionItem[] {
    const items: UserAttentionItem[] = [];

    const reviewRequests = requests.filter((request) => request.status === 'OFFERS_WAITING_FOR_REVIEW').sort(byDateTimeAsc);
    const firstReviewRequest = reviewRequests[0];
    if (firstReviewRequest) {
        items.push(item('OFFERS_TO_REVIEW', firstReviewRequest, { count: reviewRequests.length }));
    }

    const paymentRequest = requests
        .filter((request) => request.status === 'DEPOSIT_PAYMENT_PENDING')
        .sort(byDateTimeAsc)
        .find((request) => request.offers.some((offer) => offer.status === 'USER_NEEDS_DEPOSIT_PAYMENT'));
    const paymentOffer = paymentRequest?.offers.find((offer) => offer.status === 'USER_NEEDS_DEPOSIT_PAYMENT');
    if (paymentRequest && paymentOffer) {
        items.push(item('PAYMENT_DUE', paymentRequest, { bookingRequestOfferId: paymentOffer.bookingRequestOfferId }));
    }

    let unreadTotal = 0;
    let unreadBest: { request: UserAttentionRequest; offerId: string; count: number } | null = null;
    for (const request of requests) {
        for (const offer of request.offers) {
            if (offer.userUnreadNotificationCount <= 0) continue;
            unreadTotal += offer.userUnreadNotificationCount;
            if (unreadBest == null || offer.userUnreadNotificationCount > unreadBest.count) {
                unreadBest = { request, offerId: offer.bookingRequestOfferId, count: offer.userUnreadNotificationCount };
            }
        }
    }
    if (unreadBest) {
        items.push(item('OFFER_CHAT_UNREAD', unreadBest.request, { count: unreadTotal, bookingRequestOfferId: unreadBest.offerId }));
    }

    const callItem = callAttentionFind(requests);
    if (callItem) {
        items.push(callItem);
    }

    const reviewOffer = requests
        .flatMap((request) => request.offers.filter((offer) => offer.testimonialMissing).map((offer) => ({ request, offer })))
        .sort((a, b) => b.request.dateTime.getTime() - a.request.dateTime.getTime())[0];
    if (reviewOffer) {
        items.push(item('TESTIMONIAL_MISSING', reviewOffer.request, { bookingRequestOfferId: reviewOffer.offer.bookingRequestOfferId }));
    }

    return items;
}
