import { tEmail } from '../../../i18n/tEmail';
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
    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'support.resolve.preview')}
            subject={adminSupportRequestResolveForCustomerEmailSubject(locale)}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'support.resolve.intro')}</EmailText>
            <EmailText>{tEmail(locale, 'common.subjectLine', { subject })}</EmailText>
            <EmailButton href={supportRequestUrl}>{tEmail(locale, 'common.ctaRequest')}</EmailButton>
        </EmailLayout>
    );
}

export function adminSupportRequestResolveForCustomerEmailSubject(locale: Locale): string {
    return tEmail(locale, 'support.resolve.subject');
}
