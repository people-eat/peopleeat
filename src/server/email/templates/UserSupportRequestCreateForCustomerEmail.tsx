import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface UserSupportRequestCreateForCustomerEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    subject: string;
    supportRequestUrl: string;
}

export function UserSupportRequestCreateForCustomerEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    subject,
    supportRequestUrl,
}: UserSupportRequestCreateForCustomerEmailProps) {
    const emailSubject = userSupportRequestCreateForCustomerEmailSubject(locale);
    const preview = {
        de: 'Deine Support-Anfrage ist eingegangen. Wir melden uns im Chat',
        en: 'Your support request is in. We will reply in chat',
    }[locale];
    const intro = {
        de: 'Vielen Dank für deine Nachricht. Wir haben deine Support-Anfrage erhalten und melden uns so schnell wie möglich im Chat.',
        en: 'Thank you for your message. We received your support request and will reply in chat as soon as we can.',
    }[locale];
    const subjectLine = {
        de: `Betreff: ${subject}`,
        en: `Subject: ${subject}`,
    }[locale];
    const cta = { de: 'Anfrage öffnen', en: 'Open request' }[locale];

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

export function userSupportRequestCreateForCustomerEmailSubject(locale: Locale): string {
    return { de: 'Support-Anfrage erhalten', en: 'Support request received' }[locale];
}
