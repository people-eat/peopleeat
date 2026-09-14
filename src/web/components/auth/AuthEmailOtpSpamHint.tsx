import { useLocale } from '../../hooks/useLocale';
import { StatusAlert } from '../base/status-alert';

/** Info banner for email OTP dialogs: remind users to check spam/junk. */
export function AuthEmailOtpSpamHint() {
    const locale = useLocale();

    return (
        <StatusAlert tone="info" title={{ de: 'Keine E-Mail erhalten?', en: 'No email yet?' }[locale]}>
            {
                {
                    de: 'Schau auch im Spam- oder Junk-Ordner nach.',
                    en: 'Also check your spam or junk folder.',
                }[locale]
            }
        </StatusAlert>
    );
}
