import { t } from '../../../i18n/t';
import type { WebPageKey } from '../../../shared/webPage';
import { webPageKeys } from '../../../shared/webPage';
import type { Locale } from '../../utils/locale';

export function adminWebPageLabel(webPageKey: WebPageKey, locale: Locale): string {
    return t(locale, 'admin', `webPages.labels.${webPageKey}`);
}

export function parseAdminWebPageKey(value: string): WebPageKey | null {
    return (webPageKeys as readonly string[]).includes(value) ? (value as WebPageKey) : null;
}
