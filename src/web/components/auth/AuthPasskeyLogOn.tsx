import { startAuthentication } from '@simplewebauthn/browser';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { AuthPasskeyAuthenticateOptionsDocument, AuthPasskeyAuthenticateVerifyDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { Button } from '../base/button';

export function AuthPasskeyLogOn({ onSuccess }: { onSuccess?: () => void }) {
    const locale = useLocale();
    const [busy, setBusy] = useState(false);
    const [, passkeyAuthOptions] = useMutation(AuthPasskeyAuthenticateOptionsDocument);
    const [, passkeyAuthVerify] = useMutation(AuthPasskeyAuthenticateVerifyDocument);

    async function onPasskeyLogOn() {
        setBusy(true);
        try {
            const optionsResult = await passkeyAuthOptions({});
            const options = optionsResult.data?.authPasskeyAuthenticateOptions as PublicKeyCredentialRequestOptionsJSON | undefined;
            if (optionsResult.error || !options) {
                toast.error(
                    {
                        de: 'Passkey-Anmeldung fehlgeschlagen. Passkeys funktionieren nur für bestehende Konten. Neue Nutzer bitte E-Mail nutzen.',
                        en: 'Passkey log-on failed. Passkeys work only for existing accounts. First-time users should continue with email.',
                    }[locale],
                );
                return;
            }
            const credential = await startAuthentication({ optionsJSON: options });
            const verifyResult = await passkeyAuthVerify({ response: credential });
            if (verifyResult.error || !verifyResult.data?.authPasskeyAuthenticateVerify.success) {
                toast.error(
                    {
                        de: 'Passkey-Anmeldung fehlgeschlagen. Passkeys funktionieren nur für bestehende Konten. Neue Nutzer bitte E-Mail nutzen.',
                        en: 'Passkey log-on failed. Passkeys work only for existing accounts. First-time users should continue with email.',
                    }[locale],
                );
                return;
            }
            // Success toast / navigation come from AuthIdentityGate `onReady`
            // after the session is fully signed in (including any TOTP step).
            onSuccess?.();
        } catch {
            toast.error(
                {
                    de: 'Passkey-Anmeldung abgebrochen. Passkeys funktionieren nur für bestehende Konten. Neue Nutzer bitte E-Mail nutzen.',
                    en: 'Passkey log-on cancelled. Passkeys work only for existing accounts. First-time users should continue with email.',
                }[locale],
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="grid gap-3">
            <div className="relative text-center text-sm text-muted-foreground">
                <span>{{ de: 'oder', en: 'or' }[locale]}</span>
            </div>
            <Button type="button" variant="outline" onClick={() => void onPasskeyLogOn()} disabled={busy}>
                {{ de: 'Mit Passkey anmelden', en: 'Log on with passkey' }[locale]}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
                {
                    {
                        de: 'Passkeys gelten nur für bestehende Konten, die bereits einen eingerichtet haben. Neue Nutzer melden sich per E-Mail an.',
                        en: 'Passkeys work only for existing accounts that already registered one. First-time users continue with email.',
                    }[locale]
                }
            </p>
        </div>
    );
}
