import { useForm, useSelector } from '@tanstack/react-form';
import type { SubmitEventHandler } from 'react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';
import { z } from 'zod';

import { AuthEmailOtpDeleteDocument, AuthEmailOtpRequestDocument, AuthEmailOtpVerifyDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { Button } from '../base/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../base/dialog';
import { Input } from '../base/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../base/input-otp';
import { AuthEmailOtpSpamHint } from './AuthEmailOtpSpamHint';

export type AuthEmailOtpSession = {
    authEmailOtp: {
        authEmailOtpId: string;
        emailAddress: string;
        verifiedAt?: string | Date | null;
    } | null;
};

function emailAddressError(value: string, locale: 'de' | 'en'): string | undefined {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0) {
        return { de: 'Bitte gib eine E-Mail-Adresse ein.', en: 'Please enter an email address.' }[locale];
    }
    if (!z.email().safeParse(normalized).success) {
        return {
            de: 'Bitte gib eine gültige E-Mail-Adresse ein.',
            en: 'Please enter a valid email address.',
        }[locale];
    }
    return undefined;
}

export function AuthEmailOtpFlow({
    session,
    busy,
    setBusy,
}: {
    session: AuthEmailOtpSession;
    busy: boolean;
    setBusy: (busy: boolean) => void;
}) {
    const locale = useLocale();
    const [otpCode, setOtpCode] = useState('');
    const verifyStarted = useRef(false);
    const [, requestOtp] = useMutation(AuthEmailOtpRequestDocument);
    const [, verifyOtp] = useMutation(AuthEmailOtpVerifyDocument);
    const [, deleteOtp] = useMutation(AuthEmailOtpDeleteDocument);

    const form = useForm({
        defaultValues: {
            email: '',
        },
        onSubmit: async ({ value }) => {
            if (busy) return;
            const submittedEmail = value.email.trim().toLowerCase();
            setBusy(true);
            try {
                const result = await requestOtp({ email: submittedEmail, locale });
                if (result.error) {
                    toast.error({ de: 'Code konnte nicht gesendet werden.', en: 'Could not send the code.' }[locale]);
                }
            } finally {
                setBusy(false);
            }
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts);
    const emailFieldDisabled = busy || isSubmitting;

    const activeOtp = session.authEmailOtp;
    const otpOpen = activeOtp !== null && !activeOtp.verifiedAt;
    const emailFieldLabel = { de: 'E-Mail-Adresse', en: 'Email address' }[locale];

    async function onVerifyOtp(code: string = otpCode) {
        if (!activeOtp || code.length !== 6 || busy || verifyStarted.current) return;
        verifyStarted.current = true;
        setBusy(true);
        try {
            const result = await verifyOtp({ email: activeOtp.emailAddress, code });
            if (result.error || !result.data?.authEmailOtpVerify.success) {
                toast.error({ de: 'Code ungültig oder abgelaufen.', en: 'Invalid or expired code.' }[locale]);
                verifyStarted.current = false;
                return;
            }
            setOtpCode('');
        } finally {
            setBusy(false);
        }
    }

    const onVerifySubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();
        void onVerifyOtp();
    };

    async function onCloseOtp() {
        if (!activeOtp) return;
        verifyStarted.current = false;
        setBusy(true);
        try {
            await deleteOtp({ authEmailOtpId: activeOtp.authEmailOtpId });
            setOtpCode('');
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <form
                className="grid gap-3"
                noValidate
                onSubmit={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    // Prefer FormData so browser autofill that skipped React onChange still submits.
                    const submittedEmail = String(new FormData(event.currentTarget).get('email') ?? '');
                    if (submittedEmail !== form.state.values.email) {
                        form.setFieldValue('email', submittedEmail);
                    }
                    void form.handleSubmit();
                }}
            >
                <form.Field
                    name="email"
                    validators={{
                        onChange: ({ value }) => emailAddressError(value, locale),
                        onBlur: ({ value }) => emailAddressError(value, locale),
                        onSubmit: ({ value }) => emailAddressError(value, locale),
                    }}
                >
                    {(field) => {
                        const errorMessage = field.state.meta.errors[0];
                        const showError =
                            typeof errorMessage === 'string' &&
                            errorMessage.length > 0 &&
                            (field.state.meta.isBlurred || submissionAttempts > 0);
                        const errorId = `${field.name}-error`;

                        return (
                            <div className="grid gap-1.5">
                                <label htmlFor="auth-email-otp-email" className="sr-only">
                                    {emailFieldLabel}
                                </label>
                                <Input
                                    id="auth-email-otp-email"
                                    name="email"
                                    type="email"
                                    inputMode="email"
                                    autoComplete="email"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    value={field.state.value}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    onBlur={field.handleBlur}
                                    placeholder={emailFieldLabel}
                                    disabled={emailFieldDisabled}
                                    aria-invalid={showError || undefined}
                                    aria-describedby={showError ? errorId : undefined}
                                />
                                {showError ? (
                                    <p id={errorId} className="text-sm text-destructive" role="alert">
                                        {errorMessage}
                                    </p>
                                ) : null}
                            </div>
                        );
                    }}
                </form.Field>
                <Button type="submit" disabled={emailFieldDisabled}>
                    {{ de: 'Code per E-Mail senden', en: 'Continue with email' }[locale]}
                </Button>
            </form>

            <Dialog
                open={otpOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        void onCloseOtp();
                    } else {
                        verifyStarted.current = false;
                    }
                }}
            >
                <DialogContent showCloseButton={false}>
                    <form className="grid gap-4" onSubmit={onVerifySubmit}>
                        <DialogHeader>
                            <DialogTitle>{{ de: 'Code eingeben', en: 'Enter code' }[locale]}</DialogTitle>
                            <DialogDescription>
                                {
                                    {
                                        de: `Wir haben einen Code an ${activeOtp?.emailAddress ?? ''} gesendet.`,
                                        en: `We sent a code to ${activeOtp?.emailAddress ?? ''}.`,
                                    }[locale]
                                }
                            </DialogDescription>
                        </DialogHeader>

                        <AuthEmailOtpSpamHint />

                        <div className="flex justify-center py-2">
                            <InputOTP
                                maxLength={6}
                                value={otpCode}
                                onChange={(next) => {
                                    verifyStarted.current = false;
                                    setOtpCode(next);
                                }}
                                onComplete={(next) => {
                                    void onVerifyOtp(next);
                                }}
                                autoComplete="one-time-code"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                disabled={busy}
                                aria-label={{ de: 'Bestätigungscode', en: 'Verification code' }[locale]}
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
                            <Button type="button" variant="ghost" onClick={() => void onCloseOtp()} disabled={busy}>
                                {{ de: 'Schließen', en: 'Close' }[locale]}
                            </Button>
                            <Button type="submit" disabled={busy || otpCode.length !== 6}>
                                {{ de: 'Bestätigen', en: 'Verify' }[locale]}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
