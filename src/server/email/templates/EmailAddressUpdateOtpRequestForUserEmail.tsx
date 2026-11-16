import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { EmailLayout, EmailText } from '../components';
import { emailStyles } from '../components/emailStyles';

interface EmailAddressUpdateOtpRequestForUserEmailProps {
    code: string;
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
}

export function EmailAddressUpdateOtpRequestForUserEmail({
    code,
    locale,
    webPageUrl,
    recipientFirstName,
}: EmailAddressUpdateOtpRequestForUserEmailProps) {
    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'auth.emailUpdate.preview', { code })}
            subject={emailAddressUpdateOtpRequestForUserEmailSubject(locale)}
            recipientFirstName={recipientFirstName}
        >
            <EmailText style={emailStyles.code}>{code}</EmailText>
            <EmailText>{tEmail(locale, 'auth.emailUpdate.body')}</EmailText>
        </EmailLayout>
    );
}

export function emailAddressUpdateOtpRequestForUserEmailSubject(locale: Locale): string {
    return tEmail(locale, 'auth.emailUpdate.subject');
}
