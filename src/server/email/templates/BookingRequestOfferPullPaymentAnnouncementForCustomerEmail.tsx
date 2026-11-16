import { tEmail } from '../../../i18n/tEmail';
import { formatCurrency, formatDate } from '../../../shared';
import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailSectionHeading, EmailText } from '../components';

interface BookingRequestOfferPullPaymentAnnouncementForCustomerEmailProps {
    locale: Locale;
    timeZone: string;
    webPageUrl: string;
    recipientFirstName?: string;
    bookingRequestId: string;
    totalCentsCustomer: number;
    pullPaymentDate: Date;
    requestUrl: string;
}

export function BookingRequestOfferPullPaymentAnnouncementForCustomerEmail({
    locale,
    timeZone,
    webPageUrl,
    recipientFirstName,
    bookingRequestId,
    totalCentsCustomer,
    pullPaymentDate,
    requestUrl,
}: BookingRequestOfferPullPaymentAnnouncementForCustomerEmailProps) {
    const subject = bookingRequestOfferPullPaymentAnnouncementForCustomerEmailSubject(locale);
    const when = formatDate(pullPaymentDate, { locale, dateStyle: 'long', timeZone });
    const amount = formatCurrency(totalCentsCustomer, { locale });

    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'payment.pullAnnouncement.preview', { amount, when })}
            subject={subject}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'payment.pullAnnouncement.intro', { when })}</EmailText>
            <EmailText>{tEmail(locale, 'payment.pullAnnouncement.why')}</EmailText>
            <EmailButton href={requestUrl}>{tEmail(locale, 'common.ctaRequest')}</EmailButton>
            <EmailSectionHeading>{tEmail(locale, 'payment.pullAnnouncement.detailsHeading')}</EmailSectionHeading>
            <EmailText style={{ marginBottom: '4px' }}>
                <strong>{tEmail(locale, 'booking.number')}:</strong> {bookingRequestId}
            </EmailText>
            <EmailText style={{ marginBottom: '4px' }}>
                <strong>{tEmail(locale, 'payment.pullAnnouncement.price')}:</strong> {amount}
            </EmailText>
            <EmailText style={{ marginBottom: '4px' }}>
                <strong>{tEmail(locale, 'payment.pullAnnouncement.chargeDate')}:</strong> {when}
            </EmailText>
            <EmailText>{tEmail(locale, 'payment.pullAnnouncement.cardNote')}</EmailText>
        </EmailLayout>
    );
}

export function bookingRequestOfferPullPaymentAnnouncementForCustomerEmailSubject(locale: Locale): string {
    return tEmail(locale, 'payment.pullAnnouncement.subject');
}
