import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface AdminSupportRequestMessageCreateForCustomerEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    subject: string;
    supportRequestUrl: string;
}

export function AdminSupportRequestMessageCreateForCustomerEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    subject,
    supportRequestUrl,
}: AdminSupportRequestMessageCreateForCustomerEmailProps) {
    const emailSubject = adminSupportRequestMessageCreateForCustomerEmailSubject(locale);
    const preview = {
        de: 'Neue Antwort auf deine Support-Anfrage. Jetzt im Chat lesen',
        en: 'New reply on your support request. Read it in chat',
    }[locale];
    const intro = {
        de: 'Unser Team hat auf deine Support-Anfrage geantwortet. Öffne den Chat, um die Nachricht zu lesen.',
        en: 'Our team replied to your support request. Open the chat to read the message.',
    }[locale];
    const subjectLine = {
        de: `Betreff: ${subject}`,
        en: `Subject: ${subject}`,
    }[locale];
    const cta = { de: 'Antwort lesen', en: 'Read reply' }[locale];

    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={preview}
            subject={emailSubject}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{intro}</EmailText>
            <EmailText>{subjectLine}</EmailText>
            <EmailButton href={supportRequestUrl}>{cta}</EmailButton>
        </EmailLayout>
    );
}

export function adminSupportRequestMessageCreateForCustomerEmailSubject(locale: Locale): string {
    return { de: 'Neue Support-Antwort', en: 'New support reply' }[locale];
}
