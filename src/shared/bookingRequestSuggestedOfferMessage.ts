import { t } from '../i18n/t';
import type { Locale } from './locale';

/** Static offer-create note for the cook to edit, in the customer's profile language. */
export function bookingRequestSuggestedOfferMessage(locale: Locale): string {
    return t(locale, 'common', 'suggestedOfferMessage');
}
