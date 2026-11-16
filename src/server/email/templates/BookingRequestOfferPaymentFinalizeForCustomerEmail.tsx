import { tEmail } from '../../../i18n/tEmail';
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

    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'payment.finalize.preview', { cookFirstName })}
            subject={subject}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>
                <strong>{tEmail(locale, 'payment.finalize.heading', { cookFirstName })}</strong>
            </EmailText>
            <EmailText>{tEmail(locale, 'payment.finalize.intro', { cookFirstName })}</EmailText>
            <EmailText>{when}</EmailText>
            <EmailText>{tEmail(locale, 'common.calendarFileDayBefore')}</EmailText>
            {receiptAttached ? <EmailText>{tEmail(locale, 'payment.finalize.receiptNote')}</EmailText> : null}
            <EmailButton href={chatUrl}>{tEmail(locale, 'common.ctaChat')}</EmailButton>
            <BookingRequestEmailBookingNumber locale={locale} bookingRequestId={bookingRequestId} />
            <BookingRequestEmailCancellationPolicy locale={locale} webPageUrl={webPageUrl} />
        </EmailLayout>
    );
}

export function bookingRequestOfferPaymentFinalizeForCustomerEmailSubject(locale: Locale): string {
    return tEmail(locale, 'payment.finalize.subject');
}
