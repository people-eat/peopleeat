import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface AdminSupportRequestResolveForCustomerEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    subject: string;
    supportRequestUrl: string;
}

export function AdminSupportRequestResolveForCustomerEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    subject,
    supportRequestUrl,
}: AdminSupportRequestResolveForCustomerEmailProps) {
    const emailSubject = adminSupportRequestResolveForCustomerEmailSubject(locale);
    const preview = {
        de: 'Deine Support-Anfrage ist gelöst. Bei Bedarf kannst du jederzeit antworten',
        en: 'Your support request is resolved. Reply anytime if you still need help',
    }[locale];
    const intro = {
        de: 'Wir haben deine Support-Anfrage als gelöst markiert. Wenn noch etwas offen ist, antworte einfach im Chat, dann öffnet sich die Anfrage wieder.',
        en: 'We marked your support request as resolved. If anything is still open, just reply in chat, and that reopens the request.',
    }[locale];
    const subjectLine = {
        de: `Betreff: ${subject}`,
        en: `Subject: ${subject}`,
    }[locale];
    const cta = { de: 'Anfrage ansehen', en: 'View request' }[locale];

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

export function adminSupportRequestResolveForCustomerEmailSubject(locale: Locale): string {
    return { de: 'Support-Anfrage gelöst', en: 'Support request resolved' }[locale];
}
