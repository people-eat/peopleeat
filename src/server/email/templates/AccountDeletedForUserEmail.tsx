import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';
import { EmailLayout, EmailText } from '../components';

interface AccountDeletedForUserEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
}

export function AccountDeletedForUserEmail({ locale, webPageUrl, recipientFirstName }: AccountDeletedForUserEmailProps) {
    return (
        <EmailLayout
            locale={locale}
            webPageUrl={webPageUrl}
            preview={tEmail(locale, 'auth.accountDeleted.preview')}
            subject={accountDeletedForUserEmailSubject(locale)}
            recipientFirstName={recipientFirstName}
        >
            <EmailText>{tEmail(locale, 'auth.accountDeleted.body')}</EmailText>
        </EmailLayout>
    );
}

export function accountDeletedForUserEmailSubject(locale: Locale): string {
    return tEmail(locale, 'auth.accountDeleted.subject');
}
