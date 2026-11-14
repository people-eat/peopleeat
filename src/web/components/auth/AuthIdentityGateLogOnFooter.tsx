import { featureToggleIsActive } from '../../../shared/featureToggle';
import { useLocale } from '../../hooks/useLocale';
import { AuthGoogleLogOn } from './AuthGoogleLogOn';
import type { AuthSession, AuthSessionRefresh } from './AuthIdentityGate';
import { AuthPasskeyLogOn } from './AuthPasskeyLogOn';

export function AuthIdentityGateLogOnFooter({ session, sessionRefresh }: { session: AuthSession; sessionRefresh: AuthSessionRefresh }) {
    const locale = useLocale();
    const googleOn = featureToggleIsActive(session.activeFeatureToggleKeys, 'SIGN_IN_GOOGLE');

    return (
        <div className="grid gap-3">
            <div className="relative text-center text-sm text-muted-foreground">
                <span>{{ de: 'oder', en: 'or' }[locale]}</span>
            </div>
            {googleOn ? <AuthGoogleLogOn session={session} /> : null}
            <AuthPasskeyLogOn onSuccess={sessionRefresh} hideDivider />
        </div>
    );
}
