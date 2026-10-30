import { formatDate } from '../../shared';
import type { UserAttentionKind } from '../../shared/attentionCopy';
import { userAttentionCopy, userAttentionKindTone } from '../../shared/attentionCopy';
import { bookingRequestStatusLabel } from '../../shared/bookingRequestStatus';
import type { Locale } from '../../shared/locale';
import type { GqlCBookingRequestStatus, GqlCProfilePageUserFragment } from '../graphql/generated';

const ATTENTION_LIMIT = 3;

const TERMINAL_REQUEST_STATUSES = new Set<GqlCBookingRequestStatus>(['EXPIRED', 'CANCELED', 'COMPLETED']);

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
    kind: UserAttentionKind;
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

export type CustomerOverviewRequest = {
    bookingRequestId: string;
    status: GqlCBookingRequestStatus;
    occasion: string;
    dateTime: string;
    exactEventAddress: {
        displayText: string;
        city: string;
    };
};

export type CustomerOverviewAttention = NonNullable<GqlCProfilePageUserFragment['attention']>[number];

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

function attentionTarget(item: CustomerOverviewAttention): CustomerOverviewAttentionTarget | null {
    const { bookingRequestId, bookingRequestOfferId } = item;
    if (item.kind === 'OFFERS_TO_REVIEW') {
        return item.count === 1 ? { kind: 'request', bookingRequestId } : { kind: 'requests' };
    }
    if (bookingRequestOfferId == null) return null;
    switch (item.kind) {
        case 'PAYMENT_DUE':
            return { kind: 'checkout', bookingRequestId, bookingRequestOfferId };
        case 'OFFER_CHAT_UNREAD':
            return { kind: 'offer', bookingRequestId, bookingRequestOfferId, search: { tab: 'chat' } };
        case 'CALL_RESPONSE_NEEDED':
        case 'CALL_PENDING':
        case 'CALL_CONFIRMED':
            return { kind: 'offer', bookingRequestId, bookingRequestOfferId, search: { tab: 'call' } };
        case 'TESTIMONIAL_MISSING':
            return { kind: 'offer', bookingRequestId, bookingRequestOfferId, search: { tab: 'testimonial' } };
    }
}

/**
 * Lays out the customer overview: server-ranked `attention` (see
 * docs/architecture/attention.md) capped at three, folded into the Next dinner
 * card when it targets that request.
 */
export function profilePageCustomerOverview(
    requests: readonly CustomerOverviewRequest[],
    attention: readonly CustomerOverviewAttention[],
    locale: Locale,
    timeZone: string,
): CustomerOverviewModel {
    const limitedAttention: CustomerOverviewAttentionItem[] = [];
    for (const item of attention) {
        if (limitedAttention.length === ATTENTION_LIMIT) break;
        const target = attentionTarget(item);
        if (target == null) continue;
        limitedAttention.push({
            kind: item.kind,
            tone: userAttentionKindTone(item.kind),
            ...userAttentionCopy(item, locale, timeZone),
            target,
        });
    }

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
