import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface UserBookingRequestDirectNeedsExpansionForCustomerEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    requestedCookFirstName: string;
    requestUrl: string;
}

export function UserBookingRequestDirectNeedsExpansionForCustomerEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    requestedCookFirstName,
    requestUrl,
}: UserBookingRequestDirectNeedsExpansionForCustomerEmailProps) {
    const subject = userBookingRequestDirectNeedsExpansionForCustomerEmailSubject(locale, requestedCookFirstName);

    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'booking.directNeedsExpansion.preview', { requestedCookFirstName })}
            subject={subject}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'booking.directNeedsExpansion.body', { requestedCookFirstName })}</EmailText>
            <EmailButton href={requestUrl}>{tEmail(locale, 'booking.directNeedsExpansion.cta')}</EmailButton>
        </EmailLayout>
    );
}

export function userBookingRequestDirectNeedsExpansionForCustomerEmailSubject(locale: Locale, requestedCookFirstName: string): string {
    return tEmail(locale, 'booking.directNeedsExpansion.subject', { requestedCookFirstName });
}
