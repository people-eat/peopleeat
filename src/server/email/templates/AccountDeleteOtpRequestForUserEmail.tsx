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
    const preview = {
        de: `Code zum Löschen deines Kontos: ${code}`,
        en: `Code to delete your account: ${code}`,
    }[locale];
    const body = {
        de: 'Gib diesen Code auf der Kontoseite ein, um das Löschen zu bestätigen. Er ist zehn Minuten gültig. Wenn du das nicht warst, ignoriere diese E-Mail.',
        en: 'Enter this code on the account page to confirm deletion. It expires in ten minutes. If this was not you, ignore this email.',
    }[locale];

    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={preview}
            subject={accountDeleteOtpRequestForUserEmailSubject(locale)}
            recipientFirstName={recipientFirstName}
        >
            <EmailText style={emailStyles.code}>{code}</EmailText>
            <EmailText>{body}</EmailText>
        </EmailLayout>
    );
}

export function accountDeleteOtpRequestForUserEmailSubject(locale: Locale): string {
    return { de: 'Code zum Löschen deines Kontos', en: 'Code to delete your account' }[locale];
}
