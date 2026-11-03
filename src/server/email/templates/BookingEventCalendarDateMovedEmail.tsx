import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface BookingEventCalendarDateMovedEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    requestUrl: string;
}

export function BookingEventCalendarDateMovedEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    requestUrl,
}: BookingEventCalendarDateMovedEmailProps) {
    const subject = bookingEventCalendarDateMovedEmailSubject(locale);
    const preview = {
        de: 'Das Datum hat sich geändert. Bitte nimm den alten Abend aus dem Kalender',
        en: 'The date has changed. Please remove the old evening from your calendar',
    }[locale];
    const body = {
        de: 'Das Datum hat sich geändert und ist noch nicht wieder bestätigt. Bitte nimm den alten Abend aus dem Kalender.',
        en: 'The date has changed and is not confirmed again yet. Please remove the old evening from your calendar.',
    }[locale];
    const cta = { de: 'Zur Buchung', en: 'Open the booking' }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{body}</EmailText>
            <EmailButton href={requestUrl}>{cta}</EmailButton>
        </EmailLayout>
    );
}

export function bookingEventCalendarDateMovedEmailSubject(locale: Locale): string {
    return { de: 'Datum der Buchung geändert', en: 'Booking date changed' }[locale];
}
