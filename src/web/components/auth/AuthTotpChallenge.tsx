import type { SubmitEventHandler } from 'react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { AuthTotpChallengeDeleteDocument, AuthTotpVerifyDocument } from '../../graphql/generated';
import { useT } from '../../hooks/useT';
import { Button } from '../base/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../base/dialog';
import { Input } from '../base/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../base/input-otp';
import type { AuthSessionRefresh } from './AuthIdentityGate';

export function AuthTotpChallenge({
    busy,
    setBusy,
    sessionRefresh,
}: {
    busy: boolean;
    setBusy: (busy: boolean) => void;
    sessionRefresh: AuthSessionRefresh;
}) {
    const { t } = useT('public');
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
            const refreshed = await sessionRefresh();
            if (result.error || !result.data?.authTotpVerify.success) {
                if (!refreshed?.user) {
                    toast.error(t('auth.totpInvalid'));
                    verifyStarted.current = false;
                }
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
            await sessionRefresh();
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog open onOpenChange={(open) => !open && void onDismiss()}>
            <DialogContent className="sm:max-w-md" showCloseButton={!busy}>
                <DialogHeader>
                    <DialogTitle>{t('auth.totpTitle')}</DialogTitle>
                    <DialogDescription>{recoveryMode ? t('auth.totpRecoveryBody') : t('auth.totpChallengeBody')}</DialogDescription>
                </DialogHeader>

                {recoveryMode ? (
                    <form className="grid gap-4" onSubmit={onRecoverySubmit}>
                        <Input
                            value={recoveryCode}
                            onChange={(event) => setRecoveryCode(event.target.value)}
                            autoComplete="one-time-code"
                            placeholder={t('auth.recoveryCodePlaceholder')}
                            disabled={busy}
                            autoFocus
                        />
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" disabled={busy} onClick={() => setRecoveryMode(false)}>
                                {t('auth.authenticatorCode')}
                            </Button>
                            <Button type="submit" disabled={busy || recoveryCode.trim().length < 8}>
                                {t('auth.verify')}
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
                                {t('auth.useRecoveryCode')}
                            </Button>
                            <Button type="submit" disabled={busy || otpCode.length !== 6}>
                                {t('auth.verify')}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
