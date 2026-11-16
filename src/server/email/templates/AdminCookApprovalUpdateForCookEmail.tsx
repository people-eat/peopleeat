import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';

interface AdminCookApprovalUpdateForCookEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    profileUrl: string;
}

export function AdminCookApprovalUpdateForCookEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    profileUrl,
}: AdminCookApprovalUpdateForCookEmailProps) {
    const subject = adminCookApprovalUpdateForCookEmailSubject(locale);

    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'cook.approval.preview')}
            subject={subject}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'cook.approval.intro')}</EmailText>
            <EmailText>{tEmail(locale, 'cook.approval.nudge')}</EmailText>
            <EmailButton href={profileUrl}>{tEmail(locale, 'common.ctaProfile')}</EmailButton>
        </EmailLayout>
    );
}

export function adminCookApprovalUpdateForCookEmailSubject(locale: Locale): string {
    return tEmail(locale, 'cook.approval.subject');
}
