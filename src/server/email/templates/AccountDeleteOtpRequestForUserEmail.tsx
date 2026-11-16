import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { EmailLayout, EmailText } from '../components';
import { emailStyles } from '../components/emailStyles';

interface AccountDeleteOtpRequestForUserEmailProps {
    code: string;
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
}

export function AccountDeleteOtpRequestForUserEmail({
    code,
    locale,
    webPageUrl,
    recipientFirstName,
}: AccountDeleteOtpRequestForUserEmailProps) {
    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'auth.accountDelete.preview', { code })}
            subject={accountDeleteOtpRequestForUserEmailSubject(locale)}
            recipientFirstName={recipientFirstName}
        >
            <EmailText style={emailStyles.code}>{code}</EmailText>
            <EmailText>{tEmail(locale, 'auth.accountDelete.body')}</EmailText>
        </EmailLayout>
    );
}

export function accountDeleteOtpRequestForUserEmailSubject(locale: Locale): string {
    return tEmail(locale, 'auth.accountDelete.subject');
}
