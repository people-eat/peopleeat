import { tEmail } from '../../../i18n/tEmail';
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
    const offerUrl = bookingRequestEmailCookOfferUrl(webPageUrl, bookingRequestOfferId, 'offer');

    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'payment.statement.preview')}
            subject={subject}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'payment.statement.body', { occasion })}</EmailText>
            <EmailButton href={offerUrl}>{tEmail(locale, 'common.ctaOffer')}</EmailButton>
            <BookingRequestEmailBookingNumber locale={locale} bookingRequestId={bookingRequestId} />
        </EmailLayout>
    );
}

export function bookingRequestOfferPaymentStatementForCookEmailSubject(locale: Locale): string {
    return tEmail(locale, 'payment.statement.subject');
}
