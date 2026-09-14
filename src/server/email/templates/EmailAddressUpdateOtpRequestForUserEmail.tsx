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
    const preview = {
        de: `Bestätige deine neue E-Mail-Adresse. Code: ${code}`,
        en: `Confirm your new email address. Code: ${code}`,
    }[locale];
    const subject = emailAddressUpdateOtpRequestForUserEmailSubject(locale);
    const body = {
        de: 'Gib diesen Code auf der Kontoseite ein, um deine neue E-Mail-Adresse zu bestätigen. Er ist zehn Minuten gültig.',
        en: 'Enter this code on the account page to confirm your new email address. It expires in ten minutes.',
    }[locale];

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText style={emailStyles.code}>{code}</EmailText>
            <EmailText>{body}</EmailText>
        </EmailLayout>
    );
}

export function emailAddressUpdateOtpRequestForUserEmailSubject(locale: Locale): string {
    return { de: 'Bestätige deine neue E-Mail-Adresse', en: 'Confirm your new email address' }[locale];
}
