import { formatDate, formatTime } from '../../../shared/formatDate';
import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface BookingEventCalendarRestoredEmailProps {
    locale: Locale;
    timeZone: string;
    webPageUrl: string;
    recipientFirstName?: string;
    occasion: string;
    startAt: Date;
    bookingUrl: string;
}

export function BookingEventCalendarRestoredEmail({
    locale,
    timeZone,
    webPageUrl,
    recipientFirstName,
    occasion,
    startAt,
    bookingUrl,
}: BookingEventCalendarRestoredEmailProps) {
    const subject = bookingEventCalendarRestoredEmailSubject(locale);
    const when = `${formatDate(startAt, { locale, timeZone, weekday: true, dateStyle: 'long' })}, ${formatTime(startAt, { locale, timeZone, timeStyle: 'short' })}`;
    const preview = {
        de: 'Der Abend ist bestätigt. Die Kalenderdatei ist im Anhang',
        en: 'The evening is confirmed. The calendar file is attached',
    }[locale];
    const body = {
        de: `${occasion} · ${when}. Der Abend ist bestätigt. Im Anhang ist eine Kalenderdatei. Die Uhrzeit ist der Beginn. Falls du den alten Abend gespeichert hast, ersetze ihn bitte durch diese Datei.`,
        en: `${occasion} · ${when}. The evening is confirmed. A calendar file is attached. The time is the start. If you saved the old evening, please replace it with this file.`,
    }[locale];
    const cta = { de: 'Zur Buchung', en: 'Open the booking' }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{body}</EmailText>
            <EmailButton href={bookingUrl}>{cta}</EmailButton>
        </EmailLayout>
    );
}

export function bookingEventCalendarRestoredEmailSubject(locale: Locale): string {
    return { de: 'Abend erneut bestätigt', en: 'Evening confirmed again' }[locale];
}
