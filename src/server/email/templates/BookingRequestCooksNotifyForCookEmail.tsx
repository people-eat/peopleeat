import { formatBookingEventDate } from '../../../shared/formatBookingWhen';
import type { Locale } from '../../../shared/locale';
import { timeZoneFromCountry } from '../../../shared/timeZone';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface BookingRequestCooksNotifyForCookEmailProps {
    locale: Locale;
    timeZone: string;
    venueCountry?: string | null;
    webPageUrl: string;
    recipientFirstName?: string;
    occasion: string;
    dateTime: Date;
    city: string;
    poolUrl: string;
    direct?: boolean;
}

export function BookingRequestCooksNotifyForCookEmail({
    locale,
    timeZone,
    venueCountry,
    webPageUrl,
    recipientFirstName,
    occasion,
    dateTime,
    city,
    poolUrl,
    direct = false,
}: BookingRequestCooksNotifyForCookEmailProps) {
    const when = formatBookingEventDate({
        instant: dateTime,
        locale,
        venueTimeZone: venueCountry != null ? timeZoneFromCountry(venueCountry) : timeZone,
        dateStyle: 'long',
        weekday: true,
    });
    const subject = bookingRequestCooksNotifyForCookEmailSubject(locale, { direct });
    const preview = direct
        ? {
              de: `Ein Gast hat dich direkt angefragt („${occasion}“): jetzt Menü vorschlagen`,
              en: `A guest requested you (“${occasion}”): propose a menu now`,
          }[locale]
        : {
              de: `Neue Anfrage in ${city} („${occasion}“): jetzt Menü vorschlagen`,
              en: `New request in ${city} (“${occasion}”): propose a menu now`,
          }[locale];
    const intro = direct
        ? {
              de: `Ein Gast hat dich über dein Kochprofil angefragt („${occasion}“ am ${when} in ${city}).`,
              en: `A guest requested you from your chef profile (“${occasion}” on ${when} in ${city}).`,
          }[locale]
        : {
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

export function bookingRequestCooksNotifyForCookEmailSubject(locale: Locale, options?: { direct?: boolean }): string {
    if (options?.direct) {
        return {
            de: 'Ein Gast hat dich direkt angefragt',
            en: 'A guest requested you',
        }[locale];
    }
    return {
        de: 'Buchungsanfrage in deiner Region',
        en: 'Booking request in your area',
    }[locale];
}
