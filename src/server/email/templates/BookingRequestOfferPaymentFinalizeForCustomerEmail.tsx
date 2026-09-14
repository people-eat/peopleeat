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
    webPageUrl: string;
    recipientFirstName?: string;
    cookFirstName: string;
    bookingRequestId: string;
    chatUrl: string;
}

export function BookingRequestOfferPaymentFinalizeForCustomerEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    cookFirstName,
    bookingRequestId,
    chatUrl,
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
    const cta = { de: 'Zum Chat', en: 'Open chat' }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>
                <strong>{heading}</strong>
            </EmailText>
            <EmailText>{intro}</EmailText>
            <EmailButton href={chatUrl}>{cta}</EmailButton>
            <BookingRequestEmailBookingNumber locale={locale} bookingRequestId={bookingRequestId} />
            <BookingRequestEmailCancellationPolicy locale={locale} webPageUrl={webPageUrl} />
        </EmailLayout>
    );
}

export function bookingRequestOfferPaymentFinalizeForCustomerEmailSubject(locale: Locale): string {
    return { de: 'Buchungsbestätigung', en: 'Booking confirmation' }[locale];
}
