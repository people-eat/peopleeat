import { startAuthentication } from '@simplewebauthn/browser';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { AuthPasskeyAuthenticateOptionsDocument, AuthPasskeyAuthenticateVerifyDocument } from '../../graphql/generated';
import { useT } from '../../hooks/useT';
import { Button } from '../base/button';

export function AuthPasskeyLogOn({ onSuccess, hideDivider = false }: { onSuccess?: () => Promise<unknown> | void; hideDivider?: boolean }) {
    const { t } = useT('public');
    const [busy, setBusy] = useState(false);
    const [, passkeyAuthOptions] = useMutation(AuthPasskeyAuthenticateOptionsDocument);
    const [, passkeyAuthVerify] = useMutation(AuthPasskeyAuthenticateVerifyDocument);

    async function onPasskeyLogOn() {
        setBusy(true);
        try {
            const optionsResult = await passkeyAuthOptions({});
            const options = optionsResult.data?.authPasskeyAuthenticateOptions as PublicKeyCredentialRequestOptionsJSON | undefined;
            if (optionsResult.error || !options) {
                toast.error(t('auth.passkeyFailed'));
                return;
            }
            const credential = await startAuthentication({ optionsJSON: options });
            const verifyResult = await passkeyAuthVerify({ response: credential });
            if (verifyResult.error || !verifyResult.data?.authPasskeyAuthenticateVerify.success) {
                toast.error(t('auth.passkeyFailed'));
                return;
            }
            // Success toast / navigation come from AuthIdentityGate `onReady`
            // after the session is fully signed in (including any TOTP step).
            await onSuccess?.();
        } catch {
            toast.error(t('auth.passkeyCancelled'));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="grid gap-3">
            {hideDivider ? null : (
                <div className="relative text-center text-sm text-muted-foreground">
                    <span>{t('auth.or')}</span>
                </div>
            )}
            <Button type="button" variant="outline" onClick={() => void onPasskeyLogOn()} disabled={busy}>
                {t('auth.continuePasskey')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">{t('auth.passkeyHint')}</p>
        </div>
    );
}
