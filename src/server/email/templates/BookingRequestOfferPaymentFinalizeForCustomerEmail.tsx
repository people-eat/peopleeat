import { formatBookingEventWhenFromCountry, formatBookingWhenJoined } from '../../../shared/formatBookingWhen';
import type { Locale } from '../../../shared/locale';
import {
    BookingRequestEmailBookingNumber,
    BookingRequestEmailCancellationPolicy,
    EmailButton,
    EmailLayout,
    EmailText,
} from '../components';

interface BookingRequestOfferPaymentFinalizeForCustomerEmailProps {
    locale: Locale;
    timeZone: string;
    venueCountry?: string | null;
    venueCity?: string | null;
    webPageUrl: string;
    recipientFirstName?: string;
    cookFirstName: string;
    startAt: Date;
    bookingRequestId: string;
    chatUrl: string;
    receiptAttached?: boolean;
}

export function BookingRequestOfferPaymentFinalizeForCustomerEmail({
    locale,
    timeZone,
    venueCountry,
    venueCity,
    webPageUrl,
    recipientFirstName,
    cookFirstName,
    startAt,
    bookingRequestId,
    chatUrl,
    receiptAttached = false,
}: BookingRequestOfferPaymentFinalizeForCustomerEmailProps) {
    const subject = bookingRequestOfferPaymentFinalizeForCustomerEmailSubject(locale);
    const preview = {
        de: `Deine Buchung bei ${cookFirstName} ist bestätigt. So geht's weiter`,
        en: `Your booking with ${cookFirstName} is confirmed. Here's what's next`,
    }[locale];
    const heading = {
        de: `Deine Buchung bei ${cookFirstName} ist bestätigt!`,
        en: `Your booking with ${cookFirstName} is confirmed!`,
    }[locale];
    const intro = {
        de: `Klasse, dass du dich für das Menü von ${cookFirstName} entschieden hast! Es wird garantiert eine unvergessliche Erfahrung. Wir freuen uns, dass du dabei bist. Jetzt kannst du alle weiteren Details direkt mit dem Koch besprechen.`,
        en: `Great choice on ${cookFirstName}'s menu! It will be an unforgettable experience. We're glad you're in. You can now discuss all remaining details directly with the chef.`,
    }[locale];
    const when = formatBookingWhenJoined(
        formatBookingEventWhenFromCountry({
            instant: startAt,
            locale,
            viewerTimeZone: timeZone,
            venueCountry,
            venueCity,
            dateStyle: 'long',
        }),
    );
    const calendarNote = {
        de: 'Im Anhang ist eine Kalenderdatei. Die Uhrzeit ist der Beginn, und sie erinnert dich einen Tag vorher.',
        en: 'A calendar file is attached. The time is the start, and it reminds you the day before.',
    }[locale];
    const receiptNote = receiptAttached
        ? {
              de: 'Im Anhang ist zusätzlich ein Zahlungsbeleg. Das ist keine Rechnung. Die Bewirtung rechnet der Koch direkt mit dir ab.',
              en: 'A payment receipt is also attached. It is not an invoice. The cook invoices you directly for the catering.',
          }[locale]
        : null;
    const cta = { de: 'Zum Chat', en: 'Open chat' }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>
                <strong>{heading}</strong>
            </EmailText>
            <EmailText>{intro}</EmailText>
            <EmailText>{when}</EmailText>
            <EmailText>{calendarNote}</EmailText>
            {receiptNote ? <EmailText>{receiptNote}</EmailText> : null}
            <EmailButton href={chatUrl}>{cta}</EmailButton>
            <BookingRequestEmailBookingNumber locale={locale} bookingRequestId={bookingRequestId} />
            <BookingRequestEmailCancellationPolicy locale={locale} webPageUrl={webPageUrl} />
        </EmailLayout>
    );
}

export function bookingRequestOfferPaymentFinalizeForCustomerEmailSubject(locale: Locale): string {
    return { de: 'Buchungsbestätigung', en: 'Booking confirmation' }[locale];
}
