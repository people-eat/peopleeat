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
    const preview = {
        de: `Dein peopleeat Anmeldecode: ${code} (10 Minuten gültig)`,
        en: `Your peopleeat sign-in code: ${code} (expires in 10 minutes)`,
    }[locale];
    const subject = authEmailOtpRequestForUserEmailSubject(locale, code);
    const body = {
        de: 'Gib diesen Code auf der Anmeldeseite ein. Er ist zehn Minuten gültig.',
        en: 'Enter this code on the sign-in page. It expires in ten minutes.',
    }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText style={emailStyles.code}>{code}</EmailText>
            <EmailText>{body}</EmailText>
        </EmailLayout>
    );
}

/** Subject includes the code so inbox list / e2e can read it without the HTML body. */
export function authEmailOtpRequestForUserEmailSubject(locale: Locale, code: string): string {
    return {
        de: `Dein peopleeat Anmeldecode: ${code}`,
        en: `Your peopleeat sign-in code: ${code}`,
    }[locale];
}
