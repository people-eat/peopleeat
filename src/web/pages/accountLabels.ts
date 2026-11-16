// Thin title helpers for account chrome. Sidebars/breadcrumbs must import
// from here — never from `AccountPage` — so the account page module (cropper,
// passkeys, mutations) stays out of unrelated shells. Copy lives in `common`
// because account is reachable from both profile and admin.

import { t } from '../../i18n/t';
import type { Locale } from '../../shared/locale';

export function accountPageTitle(locale: Locale): string {
    return t(locale, 'common', 'shell.account');
}

export function accountPageDescription(locale: Locale): string {
    return t(locale, 'common', 'shell.accountDescription');
}
