import { ShieldCheckIcon } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useRef, useState } from 'react';
import type { SubmitEventHandler } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import {
    AccountAuthTotpDisableDocument,
    AccountAuthTotpEnrollCancelDocument,
    AccountAuthTotpEnrollConfirmDocument,
    AccountAuthTotpEnrollStartDocument,
} from '../../graphql/generated';
import { useT } from '../../hooks/useT';
import { Button } from '../base/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../base/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../base/input-otp';

type TotpSummary = {
    authTimeBasedOneTimePasswordId: string;
    confirmedAt: string | Date | null;
    recoveryCodesRemaining: number;
    createdAt: string | Date;
} | null;

export function AuthTotpAccountSection({ totp, actionBusy }: { totp: TotpSummary; actionBusy: boolean }) {
    const { t } = useT('public');
    const { t: tCommon } = useT('common');
    const [busy, setBusy] = useState(false);
    const [enrollOpen, setEnrollOpen] = useState(false);
    const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [confirmCode, setConfirmCode] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
    const [disableOpen, setDisableOpen] = useState(false);
    const [disableCode, setDisableCode] = useState('');
    const confirmStarted = useRef(false);
    const disableStarted = useRef(false);

    const [, enrollStart] = useMutation(AccountAuthTotpEnrollStartDocument);
    const [, enrollConfirm] = useMutation(AccountAuthTotpEnrollConfirmDocument);
    const [, enrollCancel] = useMutation(AccountAuthTotpEnrollCancelDocument);
    const [, disable] = useMutation(AccountAuthTotpDisableDocument);

    const confirmed = totp?.confirmedAt != null;
    const disabled = busy || actionBusy;

    async function onEnable() {
        setBusy(true);
        try {
            const result = await enrollStart({});
            const payload = result.data?.user.authTotpEnrollStart;
            if (result.error || !payload) {
                toast.error(t('auth.totpEnrollFailed'));
                return;
            }
            setOtpauthUrl(payload.otpauthUrl);
            setSecret(payload.secret);
            setConfirmCode('');
            setRecoveryCodes(null);
            confirmStarted.current = false;
            setEnrollOpen(true);
        } finally {
            setBusy(false);
        }
    }

    async function onConfirm(code: string = confirmCode) {
        if (code.length !== 6 || busy || confirmStarted.current) return;
        confirmStarted.current = true;
        setBusy(true);
        try {
            const result = await enrollConfirm({ code });
            const codes = result.data?.user.authTotpEnrollConfirm.recoveryCodes;
            if (result.error || !codes) {
                toast.error(t('auth.totpCodeInvalid'));
                confirmStarted.current = false;
                return;
            }
            setRecoveryCodes(codes);
            setOtpauthUrl(null);
            setSecret(null);
            setConfirmCode('');
            toast.success(t('auth.totpEnabled'));
        } finally {
            setBusy(false);
        }
    }

    const onConfirmSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();
        void onConfirm();
    };

    async function onEnrollDismiss() {
        if (recoveryCodes != null) {
            setEnrollOpen(false);
            setRecoveryCodes(null);
            return;
        }
        setBusy(true);
        try {
            await enrollCancel({});
            setEnrollOpen(false);
            setOtpauthUrl(null);
            setSecret(null);
            setConfirmCode('');
        } finally {
            setBusy(false);
        }
    }

    async function onCopySecret() {
        if (!secret) return;
        try {
            await navigator.clipboard.writeText(secret);
            toast.success(t('auth.secretCopied'));
        } catch {
            toast.error(t('auth.copyFailed'));
        }
    }

    async function onCopyRecoveryCodes() {
        if (!recoveryCodes) return;
        try {
            await navigator.clipboard.writeText(recoveryCodes.join('\n'));
            toast.success(t('auth.recoveryCopied'));
        } catch {
            toast.error(t('auth.copyFailed'));
        }
    }

    function onDownloadRecoveryCodes() {
        if (!recoveryCodes) return;
        const blob = new Blob([recoveryCodes.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'peopleeat-recovery-codes.txt';
        anchor.click();
        URL.revokeObjectURL(url);
    }

    async function onDisable(code: string = disableCode) {
        if (code.length !== 6 || busy || disableStarted.current) return;
        disableStarted.current = true;
        setBusy(true);
        try {
            const result = await disable({ code });
            if (result.error || !result.data?.user.authTotpDisable.success) {
                toast.error(t('auth.totpCodeInvalid'));
                disableStarted.current = false;
                return;
            }
            setDisableOpen(false);
            setDisableCode('');
            toast.success(t('auth.totpDisabled'));
        } finally {
            setBusy(false);
        }
    }

    const onDisableSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();
        void onDisable();
    };

    return (
        <>
            {confirmed ? (
                <div className="grid gap-3">
                    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3">
                        <div className="grid gap-0.5">
                            <p className="flex items-center gap-2 text-sm text-foreground">
                                <ShieldCheckIcon className="size-4" aria-hidden />
                                {t('auth.authenticatorActive')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {t('auth.recoveryRemaining', { count: totp.recoveryCodesRemaining })}
                            </p>
                        </div>
                        <Button type="button" variant="destructive" size="sm" disabled={disabled} onClick={() => setDisableOpen(true)}>
                            {t('auth.disable')}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3">
                    <div className="grid gap-0.5">
                        <p className="text-sm text-foreground">{t('auth.authenticatorApp')}</p>
                        <p className="text-xs text-muted-foreground">{t('auth.authenticatorBlurb')}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => void onEnable()}>
                        {t('auth.enable')}
                    </Button>
                </div>
            )}

            <Dialog
                open={enrollOpen}
                onOpenChange={(open) => {
                    if (!open) void onEnrollDismiss();
                }}
            >
                <DialogContent className="sm:max-w-md" showCloseButton={!disabled}>
                    {recoveryCodes != null ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>{t('auth.saveRecoveryTitle')}</DialogTitle>
                                <DialogDescription>{t('auth.saveRecoveryBody')}</DialogDescription>
                            </DialogHeader>
                            <ul className="grid gap-1 rounded-xl border bg-muted/40 px-4 py-3 font-mono text-sm">
                                {recoveryCodes.map((code) => (
                                    <li key={code}>{code}</li>
                                ))}
                            </ul>
                            <DialogFooter className="gap-2 sm:justify-between">
                                <div className="flex flex-wrap gap-2">
                                    <Button type="button" variant="outline" onClick={() => void onCopyRecoveryCodes()}>
                                        {t('auth.copy')}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={onDownloadRecoveryCodes}>
                                        {t('auth.download')}
                                    </Button>
                                </div>
                                <Button type="button" onClick={() => void onEnrollDismiss()}>
                                    {t('auth.done')}
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <form className="grid gap-4" onSubmit={onConfirmSubmit}>
                            <DialogHeader>
                                <DialogTitle>{t('auth.setupAuthenticatorTitle')}</DialogTitle>
                                <DialogDescription>{t('auth.setupAuthenticatorBody')}</DialogDescription>
                            </DialogHeader>
                            {otpauthUrl != null ? (
                                <div className="flex justify-center rounded-xl border bg-white p-4">
                                    <QRCodeSVG value={otpauthUrl} size={256} level="H" marginSize={2} title="TOTP QR code" />
                                </div>
                            ) : null}
                            {secret != null ? (
                                <div className="grid gap-2">
                                    <p className="text-xs text-muted-foreground">{t('auth.orEnterManually')}</p>
                                    <div className="flex items-center gap-2">
                                        <code className="min-w-0 flex-1 truncate rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
                                            {secret}
                                        </code>
                                        <Button type="button" variant="outline" size="sm" onClick={() => void onCopySecret()}>
                                            {t('auth.copy')}
                                        </Button>
                                    </div>
                                </div>
                            ) : null}
                            <div className="flex justify-center py-1">
                                <InputOTP
                                    maxLength={6}
                                    value={confirmCode}
                                    onChange={(next) => {
                                        confirmStarted.current = false;
                                        setConfirmCode(next);
                                    }}
                                    onComplete={(next) => {
                                        void onConfirm(next);
                                    }}
                                    autoComplete="one-time-code"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    disabled={disabled}
                                    aria-label={t('auth.authenticatorCode')}
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
                            </div>
                            <DialogFooter className="gap-2 sm:justify-between">
                                <Button type="button" variant="ghost" disabled={disabled} onClick={() => void onEnrollDismiss()}>
                                    {tCommon('cancel')}
                                </Button>
                                <Button type="submit" disabled={disabled || confirmCode.length !== 6}>
                                    {t('auth.confirm')}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog
                open={disableOpen}
                onOpenChange={(open) => {
                    setDisableOpen(open);
                    if (!open) {
                        setDisableCode('');
                        disableStarted.current = false;
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <form className="grid gap-4" onSubmit={onDisableSubmit}>
                        <DialogHeader>
                            <DialogTitle>{t('auth.disableTotpTitle')}</DialogTitle>
                            <DialogDescription>{t('auth.disableTotpBody')}</DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-center py-1">
                            <InputOTP
                                maxLength={6}
                                value={disableCode}
                                onChange={(next) => {
                                    disableStarted.current = false;
                                    setDisableCode(next);
                                }}
                                onComplete={(next) => {
                                    void onDisable(next);
                                }}
                                autoComplete="one-time-code"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                disabled={disabled}
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
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" disabled={disabled} onClick={() => setDisableOpen(false)}>
                                {tCommon('cancel')}
                            </Button>
                            <Button type="submit" variant="destructive" disabled={disabled || disableCode.length !== 6}>
                                {t('auth.disable')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
