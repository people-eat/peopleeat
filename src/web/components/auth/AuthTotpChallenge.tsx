import type { SubmitEventHandler } from 'react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { AuthTotpChallengeDeleteDocument, AuthTotpVerifyDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { Button } from '../base/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../base/dialog';
import { Input } from '../base/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../base/input-otp';

export function AuthTotpChallenge({ busy, setBusy }: { busy: boolean; setBusy: (busy: boolean) => void }) {
    const locale = useLocale();
    const [otpCode, setOtpCode] = useState('');
    const [recoveryMode, setRecoveryMode] = useState(false);
    const [recoveryCode, setRecoveryCode] = useState('');
    const verifyStarted = useRef(false);
    const [, verifyTotp] = useMutation(AuthTotpVerifyDocument);
    const [, deleteChallenge] = useMutation(AuthTotpChallengeDeleteDocument);

    async function onVerify(code: string) {
        if (!code || busy || verifyStarted.current) return;
        verifyStarted.current = true;
        setBusy(true);
        try {
            const result = await verifyTotp({ code });
            if (result.error || !result.data?.authTotpVerify.success) {
                toast.error({ de: 'Code ungültig oder abgelaufen.', en: 'Invalid or expired code.' }[locale]);
                verifyStarted.current = false;
                return;
            }
            setOtpCode('');
            setRecoveryCode('');
        } finally {
            setBusy(false);
        }
    }

    const onOtpSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();
        void onVerify(otpCode);
    };

    const onRecoverySubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();
        void onVerify(recoveryCode.trim());
    };

    async function onDismiss() {
        verifyStarted.current = false;
        setBusy(true);
        try {
            await deleteChallenge({});
            setOtpCode('');
            setRecoveryCode('');
            setRecoveryMode(false);
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog open onOpenChange={(open) => !open && void onDismiss()}>
            <DialogContent className="sm:max-w-md" showCloseButton={!busy}>
                <DialogHeader>
                    <DialogTitle>{{ de: 'Zwei-Faktor-Authentifizierung', en: 'Two-factor authentication' }[locale]}</DialogTitle>
                    <DialogDescription>
                        {
                            {
                                de: recoveryMode
                                    ? 'Gib einen deiner Wiederherstellungscodes ein.'
                                    : 'Gib den 6-stelligen Code aus deiner Authenticator-App ein.',
                                en: recoveryMode
                                    ? 'Enter one of your recovery codes.'
                                    : 'Enter the 6-digit code from your authenticator app.',
                            }[locale]
                        }
                    </DialogDescription>
                </DialogHeader>

                {recoveryMode ? (
                    <form className="grid gap-4" onSubmit={onRecoverySubmit}>
                        <Input
                            value={recoveryCode}
                            onChange={(event) => setRecoveryCode(event.target.value)}
                            autoComplete="one-time-code"
                            placeholder={{ de: 'Wiederherstellungscode', en: 'Recovery code' }[locale]}
                            disabled={busy}
                            autoFocus
                        />
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" disabled={busy} onClick={() => setRecoveryMode(false)}>
                                {{ de: 'Authenticator-Code', en: 'Authenticator code' }[locale]}
                            </Button>
                            <Button type="submit" disabled={busy || recoveryCode.trim().length < 8}>
                                {{ de: 'Bestätigen', en: 'Verify' }[locale]}
                            </Button>
                        </DialogFooter>
                    </form>
                ) : (
                    <form className="grid gap-4" onSubmit={onOtpSubmit}>
                        <InputOTP
                            maxLength={6}
                            value={otpCode}
                            onChange={(value) => {
                                setOtpCode(value);
                                if (value.length === 6) {
                                    void onVerify(value);
                                }
                            }}
                            disabled={busy}
                            autoFocus
                        >
                            <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                            </InputOTPGroup>
                        </InputOTP>
                        <DialogFooter className="gap-2 sm:justify-between">
                            <Button type="button" variant="ghost" disabled={busy} onClick={() => setRecoveryMode(true)}>
                                {{ de: 'Wiederherstellungscode', en: 'Use a recovery code' }[locale]}
                            </Button>
                            <Button type="submit" disabled={busy || otpCode.length !== 6}>
                                {{ de: 'Bestätigen', en: 'Verify' }[locale]}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
