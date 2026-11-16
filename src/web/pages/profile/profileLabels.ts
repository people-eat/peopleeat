// Thin title helpers for profile chrome. Shells must import from here —
// never from `ProfilePage` — so cook/customer home modules stay out of the
// opposite role's sidebar. The label lives in `common` so admin can render
// the Profile footer link without loading the profile catalog.

import { t } from '../../../i18n/t';
import type { Locale } from '../../../shared/locale';

export function profilePageTitle(locale: Locale): string {
    return t(locale, 'common', 'shell.profile');
}
