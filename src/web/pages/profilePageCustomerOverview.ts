import { formatDate } from '../../shared';
import type { Locale } from '../../shared/locale';
import { bookingRequestStatusLabel } from '../components/bookingRequestStatus';
import { callBookingOverviewHintAcrossOffers } from '../components/callBookingOverviewHint';
import type { GqlCBookingRequestOfferStatus, GqlCBookingRequestStatus } from '../graphql/generated';

const ATTENTION_LIMIT = 3;

const TERMINAL_REQUEST_STATUSES = new Set<GqlCBookingRequestStatus>(['EXPIRED', 'CANCELED', 'COMPLETED']);

type CustomerOverviewAttentionKey = 'offers-to-review' | 'payment-due' | 'unread-offers' | 'upcoming-call' | 'review-missing';

type CustomerOverviewAttentionTarget =
    | { kind: 'request'; bookingRequestId: string }
    | {
          kind: 'offer';
          bookingRequestId: string;
          bookingRequestOfferId: string;
          search?: { tab: 'chat' | 'call' | 'testimonial' };
      }
    | { kind: 'checkout'; bookingRequestId: string; bookingRequestOfferId: string }
    | { kind: 'requests' };

export type CustomerOverviewAttentionItem = {
    key: CustomerOverviewAttentionKey;
    tone: 'info' | 'warning';
    title: string;
    body: string;
    actionLabel: string;
    target: CustomerOverviewAttentionTarget;
};

export type CustomerOverviewGettingStartedStep = {
    key: 'first-request';
    title: string;
    body: string;
    href: '/{-$locale}/booking-request/form';
    actionLabel: string;
};

type CustomerOverviewNextDinner = {
    bookingRequestId: string;
    occasion: string;
    city: string;
    dateLabel: string;
    status: GqlCBookingRequestStatus;
    statusLabel: string;
    activeRequestCount: number;
    inlineAttention: CustomerOverviewAttentionItem | null;
};

type CustomerOverviewCreateMode = 'primary' | 'secondary' | 'hidden';

type CustomerOverviewModel = {
    attention: CustomerOverviewAttentionItem[];
    nextDinner: CustomerOverviewNextDinner | null;
    createMode: CustomerOverviewCreateMode;
    gettingStarted: CustomerOverviewGettingStartedStep[];
    allClear: boolean;
};

type CustomerOverviewOffer = {
    bookingRequestOfferId: string;
    status: GqlCBookingRequestOfferStatus | string;
    userUnreadNotificationCount: number;
    testimonialMissing: boolean;
    callBookings?: readonly {
        cookCallSlotBookingId?: string;
        startAt: string;
        endAt: string;
        status: string;
        initiator: string;
    }[];
};

export type CustomerOverviewRequest = {
    bookingRequestId: string;
    status: GqlCBookingRequestStatus;
    occasion: string;
    dateTime: string;
    exactEventAddress: {
        displayText: string;
        city: string;
    };
    offers: readonly CustomerOverviewOffer[];
};

function requestCity(request: CustomerOverviewRequest): string {
    const city = request.exactEventAddress.city.trim();
    return city.length > 0 ? city : request.exactEventAddress.displayText;
}

function sortByDateTimeAsc(a: CustomerOverviewRequest, b: CustomerOverviewRequest): number {
    return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
}

function attentionTargetsRequest(item: CustomerOverviewAttentionItem, bookingRequestId: string): boolean {
    if (item.target.kind === 'requests') return false;
    return item.target.bookingRequestId === bookingRequestId;
}

export function profilePageCustomerOverview(
    requests: readonly CustomerOverviewRequest[],
    locale: Locale,
    timeZone: string,
): CustomerOverviewModel {
    const attention: CustomerOverviewAttentionItem[] = [];

    const reviewRequests = requests.filter((request) => request.status === 'OFFERS_WAITING_FOR_REVIEW').sort(sortByDateTimeAsc);
    if (reviewRequests.length > 0) {
        const count = reviewRequests.length;
        const first = reviewRequests[0]!;
        attention.push({
            key: 'offers-to-review',
            tone: 'warning',
            title:
                count === 1
                    ? { de: 'Angebot wartet auf deine Entscheidung', en: 'An offer is waiting for your decision' }[locale]
                    : {
                          de: `${count} Anfragen mit Angeboten zum Prüfen`,
                          en: `${count} requests with offers to review`,
                      }[locale],
            body: {
                de: 'Vergleiche die Vorschläge und nimm eines an, sobald es passt.',
                en: 'Compare the proposals and accept one when it feels right.',
            }[locale],
            actionLabel:
                count === 1
                    ? { de: 'Angebote ansehen', en: 'Review offers' }[locale]
                    : { de: 'Zu den Anfragen', en: 'View requests' }[locale],
            target: count === 1 ? { kind: 'request', bookingRequestId: first.bookingRequestId } : { kind: 'requests' },
        });
    }

    const paymentRequest = requests
        .filter((request) => request.status === 'DEPOSIT_PAYMENT_PENDING')
        .sort(sortByDateTimeAsc)
        .find((request) => request.offers.some((offer) => offer.status === 'USER_NEEDS_DEPOSIT_PAYMENT'));
    if (paymentRequest) {
        const offer = paymentRequest.offers.find((entry) => entry.status === 'USER_NEEDS_DEPOSIT_PAYMENT')!;
        attention.push({
            key: 'payment-due',
            tone: 'warning',
            title: { de: 'Zahlung ausstehend', en: 'Payment due' }[locale],
            body: {
                de: `${paymentRequest.occasion}: hinterlege deine Zahlung, um das Dinner zu bestätigen.`,
                en: `${paymentRequest.occasion}: add your payment details to confirm the dinner.`,
            }[locale],
            actionLabel: { de: 'Zum Checkout', en: 'Go to checkout' }[locale],
            target: {
                kind: 'checkout',
                bookingRequestId: paymentRequest.bookingRequestId,
                bookingRequestOfferId: offer.bookingRequestOfferId,
            },
        });
    }

    let unreadTotal = 0;
    let unreadBestCount = 0;
    let unreadTarget: Extract<CustomerOverviewAttentionTarget, { kind: 'offer' }> | null = null;
    for (const request of requests) {
        for (const offer of request.offers) {
            if (offer.userUnreadNotificationCount <= 0) continue;
            unreadTotal += offer.userUnreadNotificationCount;
            if (offer.userUnreadNotificationCount > unreadBestCount) {
                unreadBestCount = offer.userUnreadNotificationCount;
                unreadTarget = {
                    kind: 'offer',
                    bookingRequestId: request.bookingRequestId,
                    bookingRequestOfferId: offer.bookingRequestOfferId,
                    search: { tab: 'chat' },
                };
            }
        }
    }
    if (unreadTotal > 0 && unreadTarget != null) {
        attention.push({
            key: 'unread-offers',
            tone: 'warning',
            title:
                unreadTotal === 1
                    ? { de: 'Neue Nachricht im Angebotschat', en: 'New message in offer chat' }[locale]
                    : {
                          de: `${unreadTotal} neue Nachrichten in Angebotschats`,
                          en: `${unreadTotal} new messages in offer chats`,
                      }[locale],
            body: {
                de: 'Öffne den Chat, um zu antworten.',
                en: 'Open the chat to reply.',
            }[locale],
            actionLabel: { de: 'Zum Chat', en: 'Open chat' }[locale],
            target: unreadTarget,
        });
    }

    let callAttention: CustomerOverviewAttentionItem | null = null;
    for (const request of requests) {
        const hint = callBookingOverviewHintAcrossOffers(request.offers, locale, timeZone);
        if (!hint) continue;
        const needsResponse = hint.booking.status === 'PENDING' && hint.booking.initiator === 'COOK';
        const item: CustomerOverviewAttentionItem = {
            key: 'upcoming-call',
            tone: needsResponse ? 'warning' : 'info',
            title: needsResponse
                ? { de: 'Terminvorschlag wartet auf dich', en: 'Call suggestion awaits your response' }[locale]
                : { de: 'Bevorstehender Call', en: 'Upcoming call' }[locale],
            body: hint.label,
            actionLabel: { de: 'Zum Anruf', en: 'Open call' }[locale],
            target: {
                kind: 'offer',
                bookingRequestId: request.bookingRequestId,
                bookingRequestOfferId: hint.bookingRequestOfferId,
                search: hint.openCall ? { tab: 'call' } : undefined,
            },
        };
        if (needsResponse) {
            callAttention = item;
            break;
        }
        if (callAttention == null) {
            callAttention = item;
        }
    }
    if (callAttention) {
        attention.push(callAttention);
    }

    const reviewOffer = requests
        .flatMap((request) => request.offers.filter((offer) => offer.testimonialMissing).map((offer) => ({ request, offer })))
        .sort((a, b) => new Date(b.request.dateTime).getTime() - new Date(a.request.dateTime).getTime())[0];
    if (reviewOffer) {
        attention.push({
            key: 'review-missing',
            tone: 'info',
            title: { de: 'Bewertung fehlt', en: 'Review missing' }[locale],
            body: {
                de: `${reviewOffer.request.occasion}: teile kurz, wie das Dinner war.`,
                en: `${reviewOffer.request.occasion}: share a quick note about how dinner went.`,
            }[locale],
            actionLabel: { de: 'Bewertung abgeben', en: 'Leave a review' }[locale],
            target: {
                kind: 'offer',
                bookingRequestId: reviewOffer.request.bookingRequestId,
                bookingRequestOfferId: reviewOffer.offer.bookingRequestOfferId,
                search: { tab: 'testimonial' },
            },
        });
    }

    const limitedAttention = attention.slice(0, ATTENTION_LIMIT);

    const now = Date.now();
    const activeRequests = requests.filter((request) => !TERMINAL_REQUEST_STATUSES.has(request.status)).sort(sortByDateTimeAsc);
    const nextRequest = activeRequests.find((request) => new Date(request.dateTime).getTime() >= now) ?? activeRequests[0] ?? null;

    let inlineAttention: CustomerOverviewAttentionItem | null = null;
    let standaloneAttention = limitedAttention;
    if (nextRequest != null) {
        const inlineIndex = limitedAttention.findIndex((item) => attentionTargetsRequest(item, nextRequest.bookingRequestId));
        if (inlineIndex >= 0) {
            inlineAttention = limitedAttention[inlineIndex]!;
            standaloneAttention = limitedAttention.filter((_, index) => index !== inlineIndex);
        }
    }

    const nextDinner: CustomerOverviewNextDinner | null =
        nextRequest == null
            ? null
            : {
                  bookingRequestId: nextRequest.bookingRequestId,
                  occasion: nextRequest.occasion,
                  city: requestCity(nextRequest),
                  dateLabel: formatDate(nextRequest.dateTime, { locale, timeZone, dateStyle: 'full' }),
                  status: nextRequest.status,
                  statusLabel: bookingRequestStatusLabel(nextRequest.status, locale, 'customer'),
                  activeRequestCount: activeRequests.length,
                  inlineAttention,
              };

    const createMode: CustomerOverviewCreateMode = requests.length === 0 ? 'primary' : limitedAttention.length > 0 ? 'hidden' : 'secondary';

    const gettingStarted: CustomerOverviewGettingStartedStep[] =
        requests.length === 0
            ? [
                  {
                      key: 'first-request',
                      title: { de: 'Erste Buchungsanfrage starten', en: 'Start your first booking request' }[locale],
                      body: {
                          de: 'Erzähl uns von Anlass, Termin und Gästen. Wir finden den passenden Koch.',
                          en: 'Tell us the occasion, date, and guests. We’ll find the right chef.',
                      }[locale],
                      href: '/{-$locale}/booking-request/form',
                      actionLabel: { de: 'Anfrage starten', en: 'Start request' }[locale],
                  },
              ]
            : [];

    return {
        attention: standaloneAttention,
        nextDinner,
        createMode,
        gettingStarted,
        allClear: limitedAttention.length === 0 && requests.length > 0,
    };
}
