import { tEmail } from '../../../i18n/tEmail';
import { formatBookingEventWhenFromCountry, formatBookingWhenJoined } from '../../../shared/formatBookingWhen';
import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface BookingEventCalendarRestoredEmailProps {
    locale: Locale;
    timeZone: string;
    venueCountry?: string | null;
    venueCity?: string | null;
    webPageUrl: string;
    recipientFirstName?: string;
    occasion: string;
    startAt: Date;
    bookingUrl: string;
}

export function BookingEventCalendarRestoredEmail({
    locale,
    timeZone,
    venueCountry,
    venueCity,
    webPageUrl,
    recipientFirstName,
    occasion,
    startAt,
    bookingUrl,
}: BookingEventCalendarRestoredEmailProps) {
    const subject = bookingEventCalendarRestoredEmailSubject(locale);
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
            preview={tEmail(locale, 'booking.calendarRestored.preview')}
            subject={subject}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'booking.calendarRestored.body', { occasion, when })}</EmailText>
            <EmailButton href={bookingUrl}>{tEmail(locale, 'common.ctaBooking')}</EmailButton>
        </EmailLayout>
    );
}

export function bookingEventCalendarRestoredEmailSubject(locale: Locale): string {
    return tEmail(locale, 'booking.calendarRestored.subject');
}
