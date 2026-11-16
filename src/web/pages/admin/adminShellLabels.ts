// Thin title helpers for admin chrome. Profile sidebars must import from
// here — never from `AdminLayout` — so the admin assistant (Streamdown)
// stays out of cook/customer profile bundles. The title lives in `common`
// so cook/customer sidebars can link to admin without loading the admin catalog.

import { t } from '../../../i18n/t';
import type { Locale } from '../../../shared/locale';

export function adminPageTitle(locale: Locale): string {
    return t(locale, 'common', 'shell.admin');
}

export function adminPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'description');
}
