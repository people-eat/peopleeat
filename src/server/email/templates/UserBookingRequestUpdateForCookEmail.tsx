import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface UserBookingRequestUpdateForCookEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    customerFirstName: string;
    offerUrl: string;
    dateNoLongerConfirmed?: boolean;
}

export function UserBookingRequestUpdateForCookEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    customerFirstName,
    offerUrl,
    dateNoLongerConfirmed = false,
}: UserBookingRequestUpdateForCookEmailProps) {
    const subject = userBookingRequestUpdateForCookEmailSubject(locale);

    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'booking.update.preview', { customerFirstName })}
            subject={subject}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'booking.update.body', { customerFirstName })}</EmailText>
            {dateNoLongerConfirmed ? <EmailText>{tEmail(locale, 'booking.update.dateNote')}</EmailText> : null}
            <EmailButton href={offerUrl}>{tEmail(locale, 'booking.update.cta')}</EmailButton>
        </EmailLayout>
    );
}

export function userBookingRequestUpdateForCookEmailSubject(locale: Locale): string {
    return tEmail(locale, 'booking.update.subject');
}
