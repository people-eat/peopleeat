import { tEmail } from '../../../i18n/tEmail';
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
    requestedMenuTitle?: string | null;
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
    requestedMenuTitle = null,
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
        ? tEmail(locale, 'booking.cooksNotify.previewDirect', { occasion })
        : tEmail(locale, 'booking.cooksNotify.previewPool', { city, occasion });
    const menuTitle = requestedMenuTitle?.trim() || null;
    const intro = direct
        ? menuTitle
            ? tEmail(locale, 'booking.cooksNotify.introDirectMenu', { menuTitle, occasion, when, city })
            : tEmail(locale, 'booking.cooksNotify.introDirect', { occasion, when, city })
        : tEmail(locale, 'booking.cooksNotify.introPool', { city, occasion, when });

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{intro}</EmailText>
            <EmailText>{tEmail(locale, 'booking.cooksNotify.nudge')}</EmailText>
            <EmailButton href={poolUrl}>{tEmail(locale, 'common.ctaRequest')}</EmailButton>
        </EmailLayout>
    );
}

export function bookingRequestCooksNotifyForCookEmailSubject(locale: Locale, options?: { direct?: boolean }): string {
    return tEmail(locale, options?.direct ? 'booking.cooksNotify.subjectDirect' : 'booking.cooksNotify.subjectPool');
}
