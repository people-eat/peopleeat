import { tEmail } from '../../../i18n/tEmail';
import { formatBookingEventWhenFromCountry, formatBookingWhenJoined } from '../../../shared/formatBookingWhen';
import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface UserBookingRequestOfferAcceptForCookEmailProps {
    locale: Locale;
    timeZone: string;
    venueCountry?: string | null;
    venueCity?: string | null;
    webPageUrl: string;
    recipientFirstName?: string;
    customerFirstName: string;
    occasion: string;
    startAt: Date;
    venue: string;
    chatUrl: string;
}

export function UserBookingRequestOfferAcceptForCookEmail({
    locale,
    timeZone,
    venueCountry,
    venueCity,
    webPageUrl,
    recipientFirstName,
    customerFirstName,
    occasion,
    startAt,
    venue,
    chatUrl,
}: UserBookingRequestOfferAcceptForCookEmailProps) {
    const subject = userBookingRequestOfferAcceptForCookEmailSubject(locale);
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
            preview={tEmail(locale, 'offer.acceptCook.preview', { customerFirstName })}
            subject={subject}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'offer.acceptCook.intro', { customerFirstName })}</EmailText>
            <EmailText>{tEmail(locale, 'common.occasionWhen', { occasion, when })}</EmailText>
            <EmailText>{tEmail(locale, 'offer.acceptCook.venue', { venue })}</EmailText>
            <EmailText>{tEmail(locale, 'common.calendarFileDayBefore')}</EmailText>
            <EmailText>{tEmail(locale, 'offer.acceptCook.nudge')}</EmailText>
            <EmailText>{tEmail(locale, 'offer.acceptCook.closing')}</EmailText>
            <EmailButton href={chatUrl}>{tEmail(locale, 'common.ctaChat')}</EmailButton>
        </EmailLayout>
    );
}

export function userBookingRequestOfferAcceptForCookEmailSubject(locale: Locale): string {
    return tEmail(locale, 'offer.acceptCook.subject');
}
