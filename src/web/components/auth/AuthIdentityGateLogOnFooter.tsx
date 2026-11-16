import { featureToggleIsActive } from '../../../shared/featureToggle';
import { useT } from '../../hooks/useT';
import { AuthGoogleLogOn } from './AuthGoogleLogOn';
import type { AuthSession, AuthSessionRefresh } from './AuthIdentityGate';
import { AuthPasskeyLogOn } from './AuthPasskeyLogOn';

export function AuthIdentityGateLogOnFooter({ session, sessionRefresh }: { session: AuthSession; sessionRefresh: AuthSessionRefresh }) {
    const { t } = useT('public');
    const googleOn = featureToggleIsActive(session.activeFeatureToggleKeys, 'SIGN_IN_GOOGLE');

    return (
        <div className="grid gap-3">
            <div className="relative text-center text-sm text-muted-foreground">
                <span>{t('auth.or')}</span>
            </div>
            {googleOn ? <AuthGoogleLogOn session={session} /> : null}
            <AuthPasskeyLogOn onSuccess={sessionRefresh} hideDivider />
        </div>
    );
}
