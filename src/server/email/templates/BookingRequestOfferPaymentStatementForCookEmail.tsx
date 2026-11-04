import type { Locale } from '../../../shared/locale';
import { BookingRequestEmailBookingNumber, EmailButton, EmailLayout, EmailText } from '../components';
import { bookingRequestEmailCookOfferUrl } from '../components/bookingRequestEmailUrls';

interface BookingRequestOfferPaymentStatementForCookEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    bookingRequestId: string;
    bookingRequestOfferId: string;
    occasion: string;
}

export function BookingRequestOfferPaymentStatementForCookEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    bookingRequestId,
    bookingRequestOfferId,
    occasion,
}: BookingRequestOfferPaymentStatementForCookEmailProps) {
    const subject = bookingRequestOfferPaymentStatementForCookEmailSubject(locale);
    const preview = {
        de: 'Dein Auszahlungsbetrag und die einbehaltene peopleeat-Gebühr',
        en: 'Your payout amount and the peopleeat fee we withheld',
    }[locale];
    const intro = {
        de: `Die Buchung (${occasion}) ist bezahlt. Im Anhang ist deine Abrechnung mit Menü, Fahrtkosten, peopleeat-Gebühr und Auszahlungsbetrag. Das ist keine Rechnung. Bitte stelle deine Rechnung an den Gast über Menü und Fahrtkosten.`,
        en: `The booking (${occasion}) is paid. Your statement is attached, with the menu, travel, the peopleeat fee, and the payout. It is not an invoice. Please invoice the guest for the menu and travel.`,
    }[locale];
    const cta = { de: 'Zum Angebot', en: 'Open the offer' }[locale];
    const offerUrl = bookingRequestEmailCookOfferUrl(webPageUrl, bookingRequestOfferId, 'offer');

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{intro}</EmailText>
            <EmailButton href={offerUrl}>{cta}</EmailButton>
            <BookingRequestEmailBookingNumber locale={locale} bookingRequestId={bookingRequestId} />
        </EmailLayout>
    );
}

export function bookingRequestOfferPaymentStatementForCookEmailSubject(locale: Locale): string {
    return { de: 'Abrechnung zu deiner Buchung', en: 'Statement for your booking' }[locale];
}
