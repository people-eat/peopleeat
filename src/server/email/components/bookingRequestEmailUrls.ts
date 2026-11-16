import { localePath } from '../../../shared/locale';
import type { Locale } from '../../../shared/locale';

function webPageBase(webPageUrl: string): string {
    return webPageUrl.replace(/\/$/, '');
}

/** Absolute public URL with locale prefix for non-default locales. */
function bookingRequestEmailPublicUrl(webPageUrl: string, locale: Locale, path: string): string {
    const base = webPageBase(webPageUrl);
    const normalized = (path.startsWith('/') ? path : `/${path}`) as `/${string}`;
    return `${base}${localePath(locale, normalized)}`;
}

export function bookingRequestEmailTermsUrl(webPageUrl: string, locale: Locale): string {
    return bookingRequestEmailPublicUrl(webPageUrl, locale, '/terms-and-conditions');
}

export function bookingRequestEmailCustomerRequestUrl(webPageUrl: string, bookingRequestId: string): string {
    return `${webPageBase(webPageUrl)}/profile/booking-requests/${bookingRequestId}`;
}

export function bookingRequestEmailCustomerOfferUrl(
    webPageUrl: string,
    bookingRequestId: string,
    bookingRequestOfferId: string,
    tab?: 'chat' | 'offer',
): string {
    const base = `${webPageBase(webPageUrl)}/profile/booking-requests/${bookingRequestId}/offers/${bookingRequestOfferId}`;
    return tab ? `${base}?tab=${tab}` : base;
}

export function bookingRequestEmailCookOfferUrl(webPageUrl: string, bookingRequestOfferId: string, tab?: 'chat' | 'offer'): string {
    const base = `${webPageBase(webPageUrl)}/profile/booking-request-offers/${bookingRequestOfferId}`;
    return tab ? `${base}?tab=${tab}` : base;
}
