import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { EmailLayout, EmailText } from '../components';

interface UserBookingRequestOfferDeclineForCookEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    customerFirstName: string;
    reason?: string | null;
}

export function UserBookingRequestOfferDeclineForCookEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    customerFirstName,
    reason,
}: UserBookingRequestOfferDeclineForCookEmailProps) {
    const subject = userBookingRequestOfferDeclineForCookEmailSubject(locale);
    const trimmedReason = reason?.trim() || null;

    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'offer.declineCook.preview', { customerFirstName })}
            subject={subject}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'offer.declineCook.intro', { customerFirstName })}</EmailText>
            {trimmedReason ? (
                <EmailText>
                    {tEmail(locale, 'offer.declineCook.reasonLabel')}: {trimmedReason}
                </EmailText>
            ) : null}
            <EmailText>{tEmail(locale, 'offer.declineCook.closing')}</EmailText>
        </EmailLayout>
    );
}

export function userBookingRequestOfferDeclineForCookEmailSubject(locale: Locale): string {
    return tEmail(locale, 'offer.declineCook.subject');
}
