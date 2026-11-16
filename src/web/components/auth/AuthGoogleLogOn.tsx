import { useRouter } from '@tanstack/react-router';

import { featureToggleIsActive } from '../../../shared/featureToggle';
import { useT } from '../../hooks/useT';
import { returnToFromLocation } from '../../utils/returnTo';
import { Button } from '../base/button';
import type { AuthSession } from './AuthIdentityGate';

function GoogleMark() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4">
            <path
                fill="#4285F4"
                d="M23.49 12.27c0-.82-.07-1.64-.23-2.43H12v4.6h6.46a5.52 5.52 0 0 1-2.4 3.63v3h3.87c2.26-2.08 3.56-5.15 3.56-8.8"
            />
            <path
                fill="#34A853"
                d="M12 24c3.24 0 5.97-1.07 7.96-2.93l-3.87-3c-1.08.73-2.47 1.16-4.09 1.16-3.14 0-5.8-2.12-6.76-4.96H1.24v3.09A12 12 0 0 0 12 24"
            />
            <path
                fill="#FBBC05"
                d="M5.24 14.27A7.2 7.2 0 0 1 4.86 12c0-.79.14-1.55.38-2.27V6.64H1.24A12 12 0 0 0 0 12c0 1.94.46 3.77 1.24 5.36z"
            />
            <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.96 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.24 6.64l4 3.09C6.2 6.87 8.86 4.75 12 4.75"
            />
        </svg>
    );
}

export function AuthGoogleLogOn({ session }: { session: AuthSession }) {
    const { t } = useT('public');
    const router = useRouter();

    if (!featureToggleIsActive(session.activeFeatureToggleKeys, 'SIGN_IN_GOOGLE')) {
        return null;
    }

    function onGoogleLogOn() {
        const returnTo = returnToFromLocation(router.state.location);
        window.location.assign(`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`);
    }

    return (
        <Button type="button" variant="outline" onClick={onGoogleLogOn}>
            <GoogleMark />
            {t('auth.continueGoogle')}
        </Button>
    );
}
