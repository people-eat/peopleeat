import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { EmailLayout, EmailText } from '../components';

interface UserBookingRequestOfferAcceptForNotChosenCookEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    customerFirstName: string;
}

export function UserBookingRequestOfferAcceptForNotChosenCookEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    customerFirstName,
}: UserBookingRequestOfferAcceptForNotChosenCookEmailProps) {
    const subject = userBookingRequestOfferAcceptForNotChosenCookEmailSubject(locale);

    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'offer.acceptNotChosen.preview')}
            subject={subject}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'offer.acceptNotChosen.intro', { customerFirstName })}</EmailText>
            <EmailText>{tEmail(locale, 'offer.acceptNotChosen.closing')}</EmailText>
        </EmailLayout>
    );
}

export function userBookingRequestOfferAcceptForNotChosenCookEmailSubject(locale: Locale): string {
    return tEmail(locale, 'offer.acceptNotChosen.subject');
}
