import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { AuthEmailOtpDeleteDocument, AuthSessionUpdatesDocument, AuthUserCreateDocument } from '../../graphql/generated';
import type { GqlCAuthSessionFieldsFragment } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { fallbackTimeZone } from '../../hooks/useTimeZone';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '../base/alert-dialog';
import { Button } from '../base/button';
import { AuthEmailOtpFlow } from './AuthEmailOtpFlow';
import { AuthTotpChallenge } from './AuthTotpChallenge';
import { sessionAuthPhase } from './sessionAuthPhase';
import { UserProfileForm } from './UserProfileForm';
import type { UserProfileFormValues } from './UserProfileForm';

export type AuthSession = GqlCAuthSessionFieldsFragment;

export const AUTH_USER_PROFILE_FORM_ID = 'auth-user-profile';

export function AuthIdentityGate({
    initialSession,
    onReady,
    onSessionChange,
    onBusyChange,
    children,
    footer,
    includeCook = false,
    requireProfileDetails = true,
    externalSubmit = false,
    profileInitialValues,
}: {
    initialSession: AuthSession;
    /** Called once when the session is signed in (profile collected at create). */
    onReady?: (session: AuthSession) => void;
    /** Fired whenever session state changes (so parents can update Header, etc.). */
    onSessionChange?: (session: AuthSession) => void;
    /** Fired when gate-owned async work starts/stops (OTP, register, …). */
    onBusyChange?: (busy: boolean) => void;
    children?: (session: AuthSession) => ReactNode;
    /** Rendered below the email form while anonymous / OTP-pending (e.g. passkey). */
    footer?: (session: AuthSession) => ReactNode;
    /** When true, registration collects cook profile fields and passes `cook` on `userCreate`. */
    includeCook?: boolean;
    /**
     * When true (default), registration requires phone, birth date, and
     * preferred communication. Gift-card purchase passes false so those fields
     * are omitted from `userCreate`.
     */
    requireProfileDetails?: boolean;
    /**
     * When true, the profile form omits its submit button so a parent footer
     * can submit via `form={AUTH_USER_PROFILE_FORM_ID}`.
     */
    externalSubmit?: boolean;
    /** Optional seed for registration profile fields (e.g. `firstName` from a partner deep-link). */
    profileInitialValues?: Partial<UserProfileFormValues>;
}) {
    const locale = useLocale();
    const client = useClient();
    const [session, setSession] = useState(initialSession);
    const [busy, setBusyState] = useState(false);
    const readyNotified = useRef(false);
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;
    const onSessionChangeRef = useRef(onSessionChange);
    onSessionChangeRef.current = onSessionChange;
    const onBusyChangeRef = useRef(onBusyChange);
    onBusyChangeRef.current = onBusyChange;

    function setBusy(next: boolean) {
        setBusyState(next);
        onBusyChangeRef.current?.(next);
    }
    const [, createUser] = useMutation(AuthUserCreateDocument);
    const [, deleteOtp] = useMutation(AuthEmailOtpDeleteDocument);

    function applySession(next: AuthSession) {
        setSession(next);
        onSessionChangeRef.current?.(next);
    }

    useEffect(() => {
        const request = createRequest(AuthSessionUpdatesDocument, {});
        const operation = client.executeSubscription(request);
        const { unsubscribe } = pipe(
            operation,
            subscribe((result) => {
                const next = result.data?.sessionUpdates;
                if (next) {
                    applySession(next);
                }
            }),
        );
        return unsubscribe;
    }, [client]);

    useEffect(() => {
        if (sessionAuthPhase(session) !== 'signedIn' || readyNotified.current) {
            return;
        }
        readyNotified.current = true;
        onReadyRef.current?.(session);
    }, [session]);

    const phase = sessionAuthPhase(session);

    async function onRegister(values: UserProfileFormValues) {
        setBusy(true);
        try {
            const result = await createUser({
                input: {
                    firstName: values.firstName,
                    lastName: values.lastName,
                    locale,
                    timeZone: fallbackTimeZone(),
                    ...(values.phoneNumber ? { phoneNumber: values.phoneNumber } : {}),
                    ...(values.birthDate ? { birthDate: values.birthDate } : {}),
                    ...(values.preferredCommunication ? { preferredCommunication: values.preferredCommunication } : {}),
                    ...(values.cook ? { cook: values.cook } : {}),
                },
            });
            if (result.error || !result.data?.userCreate.success) {
                toast.error({ de: 'Registrierung fehlgeschlagen.', en: 'Could not complete registration.' }[locale]);
            }
        } finally {
            setBusy(false);
        }
    }

    async function onDiscardVerifiedEmail() {
        const otp = session.authEmailOtp;
        if (!otp || busy) return;
        setBusy(true);
        try {
            const result = await deleteOtp({ authEmailOtpId: otp.authEmailOtpId });
            if (result.error || !result.data?.authEmailOtpDelete.success) {
                toast.error(
                    {
                        de: 'Bestätigte E-Mail konnte nicht verworfen werden.',
                        en: 'Could not discard the verified email.',
                    }[locale],
                );
            }
        } finally {
            setBusy(false);
        }
    }

    if (phase === 'signedIn') {
        return children ? <>{children(session)}</> : null;
    }

    if (phase === 'totpPending') {
        return <AuthTotpChallenge busy={busy} setBusy={setBusy} />;
    }

    if (phase === 'register') {
        const verifiedEmail = session.authEmailOtp?.emailAddress ?? '';
        return (
            <div className="grid gap-8">
                <div className="grid gap-3">
                    <div className="grid gap-1">
                        <p className="text-sm text-muted-foreground">{{ de: 'Bestätigte E-Mail', en: 'Verified email' }[locale]}</p>
                        <p className="font-medium break-all">{verifiedEmail}</p>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button type="button" variant="outline" size="sm" className="w-fit" disabled={busy}>
                                {{ de: 'Andere E-Mail verwenden', en: 'Use a different email' }[locale]}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    {{ de: 'Bestätigte E-Mail verwerfen?', en: 'Discard verified email?' }[locale]}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    {
                                        {
                                            de: `${verifiedEmail} ist bereits bestätigt. Wenn du sie verwirfst, musst du den Code an eine neue Adresse erneut anfordern.`,
                                            en: `${verifiedEmail} is already verified. Discarding it means you'll need to request a new code for a different address.`,
                                        }[locale]
                                    }
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={busy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                                <AlertDialogAction variant="destructive" disabled={busy} onClick={() => void onDiscardVerifiedEmail()}>
                                    {{ de: 'Verwerfen', en: 'Discard' }[locale]}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>

                <div className="grid gap-4">
                    <p className="font-medium">{{ de: 'Profil anlegen', en: 'Create your profile' }[locale]}</p>
                    <UserProfileForm
                        formId={AUTH_USER_PROFILE_FORM_ID}
                        hideSubmitButton={externalSubmit}
                        busy={busy}
                        includeCook={includeCook}
                        requireProfileDetails={requireProfileDetails}
                        initialValues={profileInitialValues}
                        submitLabel={
                            includeCook
                                ? { de: 'Koch-Konto erstellen', en: 'Create chef account' }[locale]
                                : { de: 'Konto erstellen', en: 'Create account' }[locale]
                        }
                        onSubmit={onRegister}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-6">
            <AuthEmailOtpFlow session={session} busy={busy} setBusy={setBusy} />
            {footer?.(session)}
        </div>
    );
}
