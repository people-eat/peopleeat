import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { EmailLayout, EmailText } from '../components';

interface UserBookingRequestCancelForCookEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    reason?: string | null;
    removeSavedEvent?: boolean;
}

export function UserBookingRequestCancelForCookEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    reason,
    removeSavedEvent = false,
}: UserBookingRequestCancelForCookEmailProps) {
    const subject = userBookingRequestCancelForCookEmailSubject(locale);
    const trimmedReason = reason?.trim() || null;

    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'booking.cancelCook.preview')}
            subject={subject}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'booking.cancelCook.intro')}</EmailText>
            {trimmedReason ? <EmailText>{tEmail(locale, 'common.reasonLine', { reason: trimmedReason })}</EmailText> : null}
            {removeSavedEvent ? <EmailText>{tEmail(locale, 'common.calendarRemovalEvening')}</EmailText> : null}
            <EmailText>{tEmail(locale, 'booking.cancelCook.closing')}</EmailText>
        </EmailLayout>
    );
}

export function userBookingRequestCancelForCookEmailSubject(locale: Locale): string {
    return tEmail(locale, 'booking.cancelCook.subject');
}
