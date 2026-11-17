import { featureToggleIsActive } from '../../../shared/featureToggle';
import { useT } from '../../hooks/useT';
import { AuthFacebookLogOn } from './AuthFacebookLogOn';
import { AuthGoogleLogOn } from './AuthGoogleLogOn';
import type { AuthSession, AuthSessionRefresh } from './AuthIdentityGate';
import { AuthPasskeyLogOn } from './AuthPasskeyLogOn';

export function AuthIdentityGateLogOnFooter({ session, sessionRefresh }: { session: AuthSession; sessionRefresh: AuthSessionRefresh }) {
    const { t } = useT('public');
    const googleOn = featureToggleIsActive(session.activeFeatureToggleKeys, 'SIGN_IN_GOOGLE');
    const facebookOn = featureToggleIsActive(session.activeFeatureToggleKeys, 'SIGN_IN_FACEBOOK');

    return (
        <div className="grid gap-3">
            <div className="relative text-center text-sm text-muted-foreground">
                <span>{t('auth.or')}</span>
            </div>
            {googleOn ? <AuthGoogleLogOn session={session} /> : null}
            {facebookOn ? <AuthFacebookLogOn session={session} /> : null}
            <AuthPasskeyLogOn onSuccess={sessionRefresh} hideDivider />
        </div>
    );
}
