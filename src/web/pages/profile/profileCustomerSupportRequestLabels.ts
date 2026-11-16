import { t } from '../../../i18n/t';
import type { Locale } from '../../../shared/locale';

export function profileCustomerSupportRequestPageTitle(locale: Locale): string {
    return t(locale, 'profileCustomer', 'supportRequest.title');
}
export function profileCustomerSupportRequestPageDescription(locale: Locale): string {
    return t(locale, 'profileCustomer', 'supportRequest.description');
}
