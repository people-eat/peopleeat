import { i18nAudienceNamespace } from '../i18n/audienceNamespace';
import { t } from '../i18n/t';
import type { BookingLifecycleHue } from './bookingLifecycleHue';
import type { Locale } from './locale';

/** Derived request lifecycle — not stored on `BookingRequests`. */
export type BookingRequestStatus =
    | 'WAITING_FOR_OFFERS'
    | 'OFFERS_WAITING_FOR_REVIEW'
    | 'DEPOSIT_PAYMENT_PENDING'
    | 'PAYMENT_PULL_PENDING'
    | 'EVENT_PENDING'
    | 'COMPLETED'
    | 'EXPIRED'
    | 'CANCELED';

export type BookingRequestStatusAudience = 'admin' | 'customer';

/**
 * Statuses where an admin can still publish a blocked request.
 * Expired and canceled requests stay out of the admin home review queue.
 */
export const bookingRequestPublicationReviewQueueStatuses = [
    'WAITING_FOR_OFFERS',
    'OFFERS_WAITING_FOR_REVIEW',
] as const satisfies readonly BookingRequestStatus[];

export function bookingRequestStatusHue(status: BookingRequestStatus): BookingLifecycleHue {
    switch (status) {
        case 'WAITING_FOR_OFFERS':
            return 'yellow';
        case 'OFFERS_WAITING_FOR_REVIEW':
            return 'blue';
        case 'DEPOSIT_PAYMENT_PENDING':
        case 'COMPLETED':
            return 'purple';
        case 'PAYMENT_PULL_PENDING':
        case 'EVENT_PENDING':
            return 'green';
        case 'EXPIRED':
        case 'CANCELED':
            return 'red';
        default:
            return 'gray';
    }
}

export function bookingRequestStatusLabel(status: BookingRequestStatus, locale: Locale, audience: BookingRequestStatusAudience): string {
    return t(locale, i18nAudienceNamespace(audience), `bookingRequest.status.${status}`);
}
