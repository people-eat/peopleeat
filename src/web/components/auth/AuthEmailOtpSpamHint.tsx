import { useT } from '../../hooks/useT';
import { StatusAlert } from '../base/status-alert';

/** Info banner for email OTP dialogs: remind users to check spam/junk. */
export function AuthEmailOtpSpamHint() {
    const { t } = useT('public');

    return (
        <StatusAlert tone="info" title={t('auth.noEmailTitle')}>
            {t('auth.noEmailBody')}
        </StatusAlert>
    );
}
