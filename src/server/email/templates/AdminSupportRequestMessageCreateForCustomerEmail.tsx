import { tEmail } from '../../../i18n/tEmail';
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
    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'support.reply.preview')}
            subject={adminSupportRequestMessageCreateForCustomerEmailSubject(locale)}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'support.reply.intro')}</EmailText>
            <EmailText>{tEmail(locale, 'common.subjectLine', { subject })}</EmailText>
            <EmailButton href={supportRequestUrl}>{tEmail(locale, 'support.reply.cta')}</EmailButton>
        </EmailLayout>
    );
}

export function adminSupportRequestMessageCreateForCustomerEmailSubject(locale: Locale): string {
    return tEmail(locale, 'support.reply.subject');
}
