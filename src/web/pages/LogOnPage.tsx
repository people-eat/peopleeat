import { startRegistration } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { AuthIdentityGate } from '../components/auth/AuthIdentityGate';
import { AuthPasskeyLogOn } from '../components/auth/AuthPasskeyLogOn';
import { Button } from '../components/base/button';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { AuthPasskeyRegisterOptionsDocument, AuthPasskeyRegisterVerifyDocument } from '../graphql/generated';
import type { GqlCAuthSessionFieldsFragment, GqlCLogOnPageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { returnToSafe } from '../utils/returnTo';

const logOnPageTitle = { de: 'Anmelden', en: 'Log on' } as const;
const logOnPageDescription = {
    de: 'Melde dich mit E-Mail-Code oder Passkey an. Neue Konten werden hier ebenfalls erstellt.',
    en: 'Log on with an email code or a passkey. New accounts are created here too.',
} as const;

export function LogOnPage({ loaderData, returnTo }: { loaderData: GqlCLogOnPageQuery; returnTo?: string }) {
    const locale = useLocale();
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
                toast.error({ de: 'Passkey konnte nicht erstellt werden.', en: 'Could not create a passkey.' }[locale]);
                return;
            }
            const credential = await startRegistration({ optionsJSON: options });
            const verifyResult = await passkeyRegisterVerify({ response: credential });
            if (verifyResult.error || !verifyResult.data?.user.authPasskeyRegisterVerify.success) {
                toast.error({ de: 'Passkey konnte nicht gespeichert werden.', en: 'Could not save the passkey.' }[locale]);
                return;
            }
            toast.success({ de: 'Passkey gespeichert.', en: 'Passkey saved.' }[locale]);
        } catch {
            toast.error({ de: 'Passkey-Registrierung abgebrochen.', en: 'Passkey registration cancelled.' }[locale]);
        } finally {
            setBusy(false);
        }
    }

    return (
        <main id="main-content" className="flex min-h-screen flex-col">
            <Header user={session.user} />

            <div className="mx-auto grid w-full max-w-md flex-1 content-start gap-8 p-8">
                <div className="grid gap-2">
                    <h1 className="font-serif text-3xl tracking-tight">{logOnPageTitle[locale]}</h1>
                    <p className="text-muted-foreground">{logOnPageDescription[locale]}</p>
                </div>

                <AuthIdentityGate
                    initialSession={session}
                    onSessionChange={setSession}
                    onReady={() => {
                        toast.success({ de: 'Angemeldet.', en: 'Logged on.' }[locale]);
                        navigateAfterLogOn();
                    }}
                    footer={(_session, sessionRefresh) => <AuthPasskeyLogOn onSuccess={sessionRefresh} />}
                >
                    {(nextSession: GqlCAuthSessionFieldsFragment) => (
                        <div className="grid gap-4">
                            <p>
                                {{ de: 'Angemeldet als', en: 'Logged on as' }[locale]}{' '}
                                <span className="font-medium">{nextSession.user?.emailAddress}</span>
                            </p>
                            <Button type="button" onClick={() => void onPasskeyRegister()} disabled={busy}>
                                {{ de: 'Passkey hinzufügen', en: 'Add a passkey' }[locale]}
                            </Button>
                            <Button type="button" variant="outline" asChild>
                                <Link to="/{-$locale}">{{ de: 'Weiter zur Startseite', en: 'Continue to home' }[locale]}</Link>
                            </Button>
                        </div>
                    )}
                </AuthIdentityGate>
            </div>

            <Footer />
        </main>
    );
}
