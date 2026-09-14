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
import { useLocale } from '../../hooks/useLocale';
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
    const locale = useLocale();
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
                toast.error({ de: 'Einrichtung fehlgeschlagen.', en: 'Could not start enrollment.' }[locale]);
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
                toast.error({ de: 'Code ungültig.', en: 'Invalid code.' }[locale]);
                confirmStarted.current = false;
                return;
            }
            setRecoveryCodes(codes);
            setOtpauthUrl(null);
            setSecret(null);
            setConfirmCode('');
            toast.success({ de: 'Zwei-Faktor-Authentifizierung aktiviert.', en: 'Two-factor authentication enabled.' }[locale]);
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
            toast.success({ de: 'Geheimnis kopiert.', en: 'Secret copied.' }[locale]);
        } catch {
            toast.error({ de: 'Kopieren fehlgeschlagen.', en: 'Could not copy.' }[locale]);
        }
    }

    async function onCopyRecoveryCodes() {
        if (!recoveryCodes) return;
        try {
            await navigator.clipboard.writeText(recoveryCodes.join('\n'));
            toast.success({ de: 'Wiederherstellungscodes kopiert.', en: 'Recovery codes copied.' }[locale]);
        } catch {
            toast.error({ de: 'Kopieren fehlgeschlagen.', en: 'Could not copy.' }[locale]);
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
                toast.error({ de: 'Code ungültig.', en: 'Invalid code.' }[locale]);
                disableStarted.current = false;
                return;
            }
            setDisableOpen(false);
            setDisableCode('');
            toast.success({ de: 'Zwei-Faktor-Authentifizierung deaktiviert.', en: 'Two-factor authentication disabled.' }[locale]);
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
                    <div className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3">
                        <div className="grid gap-0.5">
                            <p className="flex items-center gap-2 text-sm text-foreground">
                                <ShieldCheckIcon className="size-4" aria-hidden />
                                {{ de: 'Authenticator-App aktiv', en: 'Authenticator app enabled' }[locale]}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {
                                    {
                                        de: `${totp.recoveryCodesRemaining} Wiederherstellungscodes übrig`,
                                        en: `${totp.recoveryCodesRemaining} recovery codes remaining`,
                                    }[locale]
                                }
                            </p>
                        </div>
                        <Button type="button" variant="destructive" size="sm" disabled={disabled} onClick={() => setDisableOpen(true)}>
                            {{ de: 'Deaktivieren', en: 'Disable' }[locale]}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3">
                    <div className="grid gap-0.5">
                        <p className="text-sm text-foreground">
                            {{ de: 'Authenticator-App (TOTP)', en: 'Authenticator app (TOTP)' }[locale]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {
                                {
                                    de: 'Zusätzlicher Schutz beim Anmelden mit einer App wie Google Authenticator.',
                                    en: 'Extra protection at sign-in with an app like Google Authenticator.',
                                }[locale]
                            }
                        </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => void onEnable()}>
                        {{ de: 'Aktivieren', en: 'Enable' }[locale]}
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
                                <DialogTitle>
                                    {{ de: 'Wiederherstellungscodes speichern', en: 'Save your recovery codes' }[locale]}
                                </DialogTitle>
                                <DialogDescription>
                                    {
                                        {
                                            de: 'Jeder Code funktioniert nur einmal. Speichere sie an einem sicheren Ort. Sie werden nicht erneut angezeigt.',
                                            en: 'Each code works once. Store them somewhere safe. They will not be shown again.',
                                        }[locale]
                                    }
                                </DialogDescription>
                            </DialogHeader>
                            <ul className="grid gap-1 rounded-xl border bg-muted/40 px-4 py-3 font-mono text-sm">
                                {recoveryCodes.map((code) => (
                                    <li key={code}>{code}</li>
                                ))}
                            </ul>
                            <DialogFooter className="gap-2 sm:justify-between">
                                <div className="flex flex-wrap gap-2">
                                    <Button type="button" variant="outline" onClick={() => void onCopyRecoveryCodes()}>
                                        {{ de: 'Kopieren', en: 'Copy' }[locale]}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={onDownloadRecoveryCodes}>
                                        {{ de: 'Download', en: 'Download' }[locale]}
                                    </Button>
                                </div>
                                <Button type="button" onClick={() => void onEnrollDismiss()}>
                                    {{ de: 'Fertig', en: 'Done' }[locale]}
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <form className="grid gap-4" onSubmit={onConfirmSubmit}>
                            <DialogHeader>
                                <DialogTitle>{{ de: 'Authenticator-App einrichten', en: 'Set up authenticator app' }[locale]}</DialogTitle>
                                <DialogDescription>
                                    {
                                        {
                                            de: 'Scanne den QR-Code mit deiner App und gib danach den aktuellen Code ein.',
                                            en: 'Scan the QR code with your app, then enter the current code.',
                                        }[locale]
                                    }
                                </DialogDescription>
                            </DialogHeader>
                            {otpauthUrl != null ? (
                                <div className="flex justify-center rounded-xl border bg-white p-4">
                                    <QRCodeSVG value={otpauthUrl} size={256} level="H" marginSize={2} title="TOTP QR code" />
                                </div>
                            ) : null}
                            {secret != null ? (
                                <div className="grid gap-2">
                                    <p className="text-xs text-muted-foreground">
                                        {{ de: 'Oder manuell eingeben:', en: 'Or enter manually:' }[locale]}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <code className="min-w-0 flex-1 truncate rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
                                            {secret}
                                        </code>
                                        <Button type="button" variant="outline" size="sm" onClick={() => void onCopySecret()}>
                                            {{ de: 'Kopieren', en: 'Copy' }[locale]}
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
                                    aria-label={{ de: 'Authenticator-Code', en: 'Authenticator code' }[locale]}
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
                                    {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                                </Button>
                                <Button type="submit" disabled={disabled || confirmCode.length !== 6}>
                                    {{ de: 'Bestätigen', en: 'Confirm' }[locale]}
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
                            <DialogTitle>
                                {{ de: 'Zwei-Faktor deaktivieren?', en: 'Disable two-factor authentication?' }[locale]}
                            </DialogTitle>
                            <DialogDescription>
                                {
                                    {
                                        de: 'Danach reicht beim Anmelden die E-Mail oder ein Passkey. Der zusätzliche App-Code entfällt. Gib zur Bestätigung einen aktuellen Code aus deiner Authenticator-App ein.',
                                        en: 'After this, sign-in only needs email or a passkey. The extra app code is no longer required. Enter a current authenticator code to confirm.',
                                    }[locale]
                                }
                            </DialogDescription>
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
                                {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                            </Button>
                            <Button type="submit" variant="destructive" disabled={disabled || disableCode.length !== 6}>
                                {{ de: 'Deaktivieren', en: 'Disable' }[locale]}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
