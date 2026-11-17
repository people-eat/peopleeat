import { useRouter } from '@tanstack/react-router';

import { featureToggleIsActive } from '../../../shared/featureToggle';
import { useT } from '../../hooks/useT';
import { returnToFromLocation } from '../../utils/returnTo';
import { Button } from '../base/button';
import type { AuthSession } from './AuthIdentityGate';

function FacebookMark() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4">
            <path
                fill="#1877F2"
                d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.09 24 18.1 24 12.07"
            />
        </svg>
    );
}

export function AuthFacebookLogOn({ session }: { session: AuthSession }) {
    const { t } = useT('public');
    const router = useRouter();

    if (!featureToggleIsActive(session.activeFeatureToggleKeys, 'SIGN_IN_FACEBOOK')) {
        return null;
    }

    function onFacebookLogOn() {
        const returnTo = returnToFromLocation(router.state.location);
        window.location.assign(`/api/auth/facebook?returnTo=${encodeURIComponent(returnTo)}`);
    }

    return (
        <Button type="button" variant="outline" onClick={onFacebookLogOn}>
            <FacebookMark />
            {t('auth.continueFacebook')}
        </Button>
    );
}
