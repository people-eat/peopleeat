import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { EmailLayout, EmailText } from '../components';

interface UserBookingRequestCancelForCustomerEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    removeSavedEvent?: boolean;
}

export function UserBookingRequestCancelForCustomerEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    removeSavedEvent = false,
}: UserBookingRequestCancelForCustomerEmailProps) {
    const subject = userBookingRequestCancelForCustomerEmailSubject(locale);

    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'booking.cancelCustomer.preview')}
            subject={subject}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'booking.cancelCustomer.body')}</EmailText>
            {removeSavedEvent ? <EmailText>{tEmail(locale, 'common.calendarRemovalEvening')}</EmailText> : null}
            <EmailText>{tEmail(locale, 'booking.cancelCustomer.closing')}</EmailText>
        </EmailLayout>
    );
}

export function userBookingRequestCancelForCustomerEmailSubject(locale: Locale): string {
    return tEmail(locale, 'booking.cancelCustomer.subject');
}
