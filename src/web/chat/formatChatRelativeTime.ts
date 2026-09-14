import { formatDistanceToNowStrict, parseISO } from 'date-fns';

import { DATE_FNS_LOCALE } from '../utils/dateFnsLocale';
import type { Locale } from '../utils/locale';

export function formatChatRelativeTime(iso: string, locale: Locale): string {
    const date = typeof iso === 'string' ? parseISO(iso) : new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return formatDistanceToNowStrict(date, { addSuffix: true, locale: DATE_FNS_LOCALE[locale] });
}
