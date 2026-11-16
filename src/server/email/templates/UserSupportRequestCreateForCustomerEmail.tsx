import { tEmail } from '../../../i18n/tEmail';
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
    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'support.create.preview')}
            subject={userSupportRequestCreateForCustomerEmailSubject(locale)}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'support.create.intro')}</EmailText>
            <EmailText>{tEmail(locale, 'common.subjectLine', { subject })}</EmailText>
            <EmailButton href={supportRequestUrl}>{tEmail(locale, 'support.create.cta')}</EmailButton>
        </EmailLayout>
    );
}

export function userSupportRequestCreateForCustomerEmailSubject(locale: Locale): string {
    return tEmail(locale, 'support.create.subject');
}
