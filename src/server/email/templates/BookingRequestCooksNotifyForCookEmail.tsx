import { formatDate } from '../../../shared/formatDate';
import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface BookingRequestCooksNotifyForCookEmailProps {
    locale: Locale;
    timeZone: string;
    webPageUrl: string;
    recipientFirstName?: string;
    occasion: string;
    dateTime: Date;
    city: string;
    poolUrl: string;
}

export function BookingRequestCooksNotifyForCookEmail({
    locale,
    timeZone,
    webPageUrl,
    recipientFirstName,
    occasion,
    dateTime,
    city,
    poolUrl,
}: BookingRequestCooksNotifyForCookEmailProps) {
    const when = formatDate(dateTime, { locale, dateStyle: 'long', weekday: true, timeZone });
    const subject = bookingRequestCooksNotifyForCookEmailSubject(locale);
    const preview = {
        de: `Neue Anfrage in ${city} („${occasion}“): jetzt Menü vorschlagen`,
        en: `New request in ${city} (“${occasion}”): propose a menu now`,
    }[locale];
    const intro = {
        de: `Gute Neuigkeiten: Eine neue Buchungsanfrage in ${city} ist verfügbar („${occasion}“ am ${when}).`,
        en: `Good news: a new booking request in ${city} is available (“${occasion}” on ${when}).`,
    }[locale];
    const nudge = {
        de: 'Erstelle jetzt einen Menüvorschlag, damit der Kunde schnell zusagen kann. Wir empfehlen, innerhalb der nächsten Stunde zu reagieren.',
        en: 'Create a menu proposal now so the customer can accept quickly. We recommend responding within the next hour.',
    }[locale];
    const linkLabel = {
        de: 'Anfrage ansehen',
        en: 'View request',
    }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{intro}</EmailText>
            <EmailText>{nudge}</EmailText>
            <EmailButton href={poolUrl}>{linkLabel}</EmailButton>
        </EmailLayout>
    );
}

export function bookingRequestCooksNotifyForCookEmailSubject(locale: Locale): string {
    return {
        de: 'Buchungsanfrage in deiner Region',
        en: 'Booking request in your area',
    }[locale];
}
