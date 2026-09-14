import { formatDate } from '../../shared';
import type { Locale } from '../utils/locale';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function localDayKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function shiftLocalDay(date: Date, days: number): Date {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
    return next;
}

/** Visible label for a chat day group (`YYYY-MM-DD`): Today / Yesterday / long date. */
export function formatChatDateMarker(isoDay: string, locale: Locale, now: Date = new Date()): string {
    if (!ISO_DAY.test(isoDay)) {
        return formatDate(isoDay, { locale, dateStyle: 'long' });
    }

    const todayKey = localDayKey(now);
    if (isoDay === todayKey) {
        return { de: 'Heute', en: 'Today' }[locale];
    }

    const yesterdayKey = localDayKey(shiftLocalDay(now, -1));
    if (isoDay === yesterdayKey) {
        return { de: 'Gestern', en: 'Yesterday' }[locale];
    }

    return formatDate(isoDay, { locale, dateStyle: 'long' });
}
