import { tEmail } from '../../../i18n/tEmail';
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

    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'booking.calendarDateMoved.preview')}
            subject={subject}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'booking.calendarDateMoved.body')}</EmailText>
            <EmailButton href={requestUrl}>{tEmail(locale, 'common.ctaBooking')}</EmailButton>
        </EmailLayout>
    );
}

export function bookingEventCalendarDateMovedEmailSubject(locale: Locale): string {
    return tEmail(locale, 'booking.calendarDateMoved.subject');
}
