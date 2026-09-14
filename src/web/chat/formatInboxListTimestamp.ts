import { dateDistanceInDays, formatDate, formatTime } from '../../shared';
import { languageTagFromLocale } from '../../shared/locale';
import type { Locale } from '../utils/locale';

/**
 * Messenger-style inbox timestamp in the viewer’s time zone:
 * same day → time; yesterday → label; 2–6 days ago → weekday; else short date.
 */
export function formatInboxListTimestamp(value: string | Date, options: { locale: Locale; timeZone: string; now?: Date }): string {
    const { locale, timeZone, now = new Date() } = options;
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return '';

    const daysAgo = dateDistanceInDays(now, date, timeZone);
    if (daysAgo <= 0) {
        return formatTime(date, { locale, timeZone, timeStyle: 'short' });
    }
    if (daysAgo === 1) {
        return { de: 'Gestern', en: 'Yesterday' }[locale];
    }
    if (daysAgo <= 6) {
        return new Intl.DateTimeFormat(languageTagFromLocale(locale), { timeZone, weekday: 'long' }).format(date);
    }
    return formatDate(date, { locale, timeZone, dateStyle: 'short' });
}
