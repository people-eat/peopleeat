// Thin title helpers for admin chrome. Profile sidebars must import from
// here — never from `AdminLayout` — so the admin assistant (Streamdown)
// stays out of cook/customer profile bundles.

import { t } from '../../../i18n/t';
import type { Locale } from '../../../shared/locale';

export function adminPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'title');
}

export function adminPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'description');
}
