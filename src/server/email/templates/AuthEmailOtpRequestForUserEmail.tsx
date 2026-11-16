import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { EmailLayout, EmailText } from '../components';
import { emailStyles } from '../components/emailStyles';

interface AuthEmailOtpRequestForUserEmailProps {
    code: string;
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
}

export function AuthEmailOtpRequestForUserEmail({ code, locale, webPageUrl, recipientFirstName }: AuthEmailOtpRequestForUserEmailProps) {
    const preview = tEmail(locale, 'auth.otp.preview', { code });
    const subject = authEmailOtpRequestForUserEmailSubject(locale, code);
    const body = tEmail(locale, 'auth.otp.body');

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText style={emailStyles.code}>{code}</EmailText>
            <EmailText>{body}</EmailText>
        </EmailLayout>
    );
}

/** Subject includes the code so inbox list / e2e can read it without the HTML body. */
export function authEmailOtpRequestForUserEmailSubject(locale: Locale, code: string): string {
    return tEmail(locale, 'auth.otp.subject', { code });
}
