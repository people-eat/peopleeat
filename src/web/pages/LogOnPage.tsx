import { startRegistration } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { featureToggleIsActive } from '../../shared/featureToggle';
import { AuthIdentityGate } from '../components/auth/AuthIdentityGate';
import { AuthIdentityGateLogOnFooter } from '../components/auth/AuthIdentityGateLogOnFooter';
import { Button } from '../components/base/button';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { AuthPasskeyRegisterOptionsDocument, AuthPasskeyRegisterVerifyDocument } from '../graphql/generated';
import type { GqlCAuthSessionFieldsFragment, GqlCLogOnPageQuery } from '../graphql/generated';
import { useT } from '../hooks/useT';
import { returnToSafe } from '../utils/returnTo';

export function LogOnPage({ loaderData, returnTo }: { loaderData: GqlCLogOnPageQuery; returnTo?: string }) {
    const { t } = useT('public');
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [session, setSession] = useState(loaderData.currentSession);
    const [, passkeyRegisterOptions] = useMutation(AuthPasskeyRegisterOptionsDocument);
    const [, passkeyRegisterVerify] = useMutation(AuthPasskeyRegisterVerifyDocument);

    function navigateAfterLogOn() {
        const safeReturnTo = returnToSafe(returnTo);
        if (safeReturnTo) {
            void navigate({ href: safeReturnTo });
            return;
        }
        void navigate({ to: '/{-$locale}/profile' });
    }

    async function onPasskeyRegister() {
        setBusy(true);
        try {
            const optionsResult = await passkeyRegisterOptions({});
            const options = optionsResult.data?.user.authPasskeyRegisterOptions as PublicKeyCredentialCreationOptionsJSON | undefined;
            if (optionsResult.error || !options) {
                toast.error(t('logOn.passkeyCreateFailed'));
                return;
            }
            const credential = await startRegistration({ optionsJSON: options });
            const verifyResult = await passkeyRegisterVerify({ response: credential });
            if (verifyResult.error || !verifyResult.data?.user.authPasskeyRegisterVerify.success) {
                toast.error(t('logOn.passkeySaveFailed'));
                return;
            }
            toast.success(t('logOn.passkeySaved'));
        } catch {
            toast.error(t('logOn.passkeyCancelled'));
        } finally {
            setBusy(false);
        }
    }

    return (
        <main id="main-content" className="flex min-h-screen flex-col">
            <Header user={session.user} />

            <div className="mx-auto grid w-full max-w-md flex-1 content-start gap-8 p-8">
                <div className="grid gap-2">
                    <h1 className="font-serif text-3xl tracking-tight">{t('logOn.title')}</h1>
                    <p className="text-muted-foreground">
                        {featureToggleIsActive(session.activeFeatureToggleKeys, 'SIGN_IN_GOOGLE')
                            ? t('logOn.descriptionWithGoogle')
                            : t('logOn.description')}
                    </p>
                </div>

                <AuthIdentityGate
                    initialSession={session}
                    onSessionChange={setSession}
                    onReady={() => {
                        toast.success(t('logOn.loggedOn'));
                        navigateAfterLogOn();
                    }}
                    footer={(gateSession, sessionRefresh) => (
                        <AuthIdentityGateLogOnFooter session={gateSession} sessionRefresh={sessionRefresh} />
                    )}
                >
                    {(nextSession: GqlCAuthSessionFieldsFragment) => (
                        <div className="grid gap-4">
                            <p>
                                {t('logOn.loggedOnAs')} <span className="font-medium">{nextSession.user?.emailAddress}</span>
                            </p>
                            <Button type="button" onClick={() => void onPasskeyRegister()} disabled={busy}>
                                {t('logOn.addPasskey')}
                            </Button>
                            <Button type="button" variant="outline" asChild>
                                <Link to="/{-$locale}">{t('logOn.continueHome')}</Link>
                            </Button>
                        </div>
                    )}
                </AuthIdentityGate>
            </div>

            <Footer />
        </main>
    );
}
