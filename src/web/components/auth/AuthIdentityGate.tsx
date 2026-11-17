import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t as translate } from '../../../i18n/t';
import {
    AuthEmailOtpDeleteDocument,
    AuthOauthTicketDeleteDocument,
    AuthSessionDocument,
    AuthSessionUpdatesDocument,
    AuthUserCreateDocument,
} from '../../graphql/generated';
import type { GqlCAuthSessionFieldsFragment } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useT } from '../../hooks/useT';
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
import { LegalAcceptancePanel } from '../LegalAcceptancePanel';
import { AuthEmailOtpFlow } from './AuthEmailOtpFlow';
import { AuthTotpChallenge } from './AuthTotpChallenge';
import { sessionAuthPhase } from './sessionAuthPhase';
import { UserProfileForm } from './UserProfileForm';
import type { UserProfileFormValues } from './UserProfileForm';

export type AuthSession = GqlCAuthSessionFieldsFragment;

export type AuthSessionRefresh = () => Promise<AuthSession | null>;

export const AUTH_USER_PROFILE_FORM_ID = 'auth-user-profile';

function profileInitialValuesFromOauthTicket(
    ticket: AuthSession['authOauthTicket'],
    requireProfileDetails: boolean,
): Partial<UserProfileFormValues> {
    if (!ticket) return {};
    return {
        ...(ticket.firstName ? { firstName: ticket.firstName } : {}),
        ...(ticket.lastName ? { lastName: ticket.lastName } : {}),
        ...(requireProfileDetails && ticket.phoneNumber ? { phoneNumber: ticket.phoneNumber } : {}),
        ...(requireProfileDetails && ticket.birthDate ? { birthDate: ticket.birthDate } : {}),
    };
}

export function AuthIdentityGate({
    initialSession,
    onReady,
    onSessionChange,
    onBusyChange,
    children,
    footer,
    includeCook = false,
    inviteCookId = null,
    requireProfileDetails = true,
    externalSubmit = false,
    profileInitialValues,
    registerHeading,
    submitLabel,
}: {
    initialSession: AuthSession;
    /** Called once when the session is signed in (profile collected at create). */
    onReady?: (session: AuthSession) => void;
    /** Fired whenever session state changes (so parents can update Header, etc.). */
    onSessionChange?: (session: AuthSession) => void;
    /** Fired when gate-owned async work starts/stops (OTP, register, …). */
    onBusyChange?: (busy: boolean) => void;
    children?: (session: AuthSession) => ReactNode;
    /**
     * Rendered below the email form while anonymous / OTP-pending (e.g. passkey).
     * Call `sessionRefresh` after a footer-owned auth mutation succeeds.
     */
    footer?: (session: AuthSession, sessionRefresh: AuthSessionRefresh) => ReactNode;
    /** When true, registration collects cook profile fields and passes `cook` on `userCreate`. */
    includeCook?: boolean;
    /** Optional inviter cook id from `/chef-sign-up?invite=`. */
    inviteCookId?: string | null;
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
    /**
     * Heading above the registration profile form. Pass `null` to hide (e.g. when the
     * parent already labels the contact block). Default: "Create your profile".
     */
    registerHeading?: string | null;
    /** Override the registration profile submit label (defaults to create account / chef account). */
    submitLabel?: string;
}) {
    const locale = useLocale();
    const { t } = useT('public');
    const client = useClient();
    const [session, setSession] = useState(initialSession);
    const [busy, setBusyState] = useState(false);
    const readyNotified = useRef(false);
    const oauthAuthErrorToasted = useRef(false);
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
    const [, deleteOauthTicket] = useMutation(AuthOauthTicketDeleteDocument);

    function applySession(next: AuthSession) {
        setSession(next);
        onSessionChangeRef.current?.(next);
    }

    // The SSE push can be lost (mobile browsers drop the stream while the user is in their mail app, and
    // missed events are not replayed), so gate-owned mutations re-read the session instead of only waiting for it.
    async function sessionRefresh(): Promise<AuthSession | null> {
        const result = await client.query(AuthSessionDocument, {}, { requestPolicy: 'network-only' }).toPromise();
        const next = result.data?.currentSession ?? null;
        if (next) {
            applySession(next);
        }
        return next;
    }

    useEffect(() => {
        if (oauthAuthErrorToasted.current || typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        const authError = url.searchParams.get('authError');
        if (authError !== 'google' && authError !== 'facebook') return;
        oauthAuthErrorToasted.current = true;
        toast.error(authError === 'facebook' ? t('auth.facebookFailed') : t('auth.googleFailed'));
        url.searchParams.delete('authError');
        const next = `${url.pathname}${url.search}${url.hash}`;
        window.history.replaceState(window.history.state, '', next);
    }, [locale]);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        function sessionUpdatesSubscribe() {
            unsubscribe?.();
            ({ unsubscribe } = pipe(
                client.executeSubscription(createRequest(AuthSessionUpdatesDocument, {})),
                subscribe((result) => {
                    const next = result.data?.sessionUpdates;
                    if (next) {
                        applySession(next);
                    }
                }),
            ));
        }

        function sessionResync() {
            sessionUpdatesSubscribe();
            void sessionRefresh();
        }

        function onVisibilityChange() {
            if (document.visibilityState === 'visible') sessionResync();
        }

        function onPageShow(event: PageTransitionEvent) {
            if (event.persisted) sessionResync();
        }

        sessionUpdatesSubscribe();
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('pageshow', onPageShow);
        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('pageshow', onPageShow);
            unsubscribe?.();
        };
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
                toast.error(t('auth.registerFailed'));
            }
            await sessionRefresh();
        } finally {
            setBusy(false);
        }
    }

    async function onDiscardVerifiedEmail() {
        const oauthTicket = session.authOauthTicket;
        const otp = session.authEmailOtp;
        if (busy) return;
        setBusy(true);
        try {
            if (oauthTicket) {
                const result = await deleteOauthTicket({ authOauthTicketId: oauthTicket.authOauthTicketId });
                if (result.error || !result.data?.authOauthTicketDelete.success) {
                    toast.error(t('auth.discardOauthFailed'));
                }
            } else if (otp) {
                const result = await deleteOtp({ authEmailOtpId: otp.authEmailOtpId });
                if (result.error || !result.data?.authEmailOtpDelete.success) {
                    toast.error(t('auth.discardEmailFailed'));
                }
            }
            await sessionRefresh();
        } finally {
            setBusy(false);
        }
    }

    if (phase === 'signedIn') {
        return children ? <>{children(session)}</> : null;
    }

    if (phase === 'legalPending') {
        return (
            <LegalAcceptancePanel
                layout="inline"
                sessionId={session.sessionId}
                acceptance={session.user?.legalAcceptance ?? null}
                fullTextInNewTab
                onResolved={async () => {
                    await sessionRefresh();
                }}
            />
        );
    }

    if (phase === 'totpPending') {
        return <AuthTotpChallenge busy={busy} setBusy={setBusy} sessionRefresh={sessionRefresh} />;
    }

    if (phase === 'register') {
        const oauthTicket = session.authOauthTicket;
        const verifiedEmail = oauthTicket?.emailAddress ?? session.authEmailOtp?.emailAddress ?? '';
        const oauthRegister = Boolean(oauthTicket?.verifiedAt);
        return (
            <div className="grid gap-8">
                <div className="grid gap-3">
                    <div className="grid gap-1">
                        <p className="text-sm text-muted-foreground">{t('auth.verifiedEmail')}</p>
                        <p className="font-medium break-all">{verifiedEmail}</p>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button type="button" variant="outline" size="sm" className="w-fit" disabled={busy}>
                                {oauthRegister ? t('auth.useDifferentSignIn') : t('auth.useDifferentEmail')}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    {oauthRegister ? t('auth.discardSignInTitle') : t('auth.discardEmailTitle')}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    {oauthRegister
                                        ? t('auth.discardSignInBody', { email: verifiedEmail })
                                        : t('auth.discardEmailBody', { email: verifiedEmail })}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={busy}>{translate(locale, 'common', 'cancel')}</AlertDialogCancel>
                                <AlertDialogAction variant="destructive" disabled={busy} onClick={() => void onDiscardVerifiedEmail()}>
                                    {t('auth.discard')}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>

                <div className="grid gap-4">
                    {registerHeading === null ? null : <p className="font-medium">{registerHeading ?? t('auth.createProfile')}</p>}
                    <UserProfileForm
                        formId={AUTH_USER_PROFILE_FORM_ID}
                        hideSubmitButton={externalSubmit}
                        busy={busy}
                        includeCook={includeCook}
                        inviteCookId={inviteCookId}
                        requireProfileDetails={requireProfileDetails}
                        initialValues={{
                            ...profileInitialValuesFromOauthTicket(oauthTicket, requireProfileDetails),
                            ...profileInitialValues,
                        }}
                        submitLabel={submitLabel ?? (includeCook ? t('auth.createCookAccount') : t('auth.createAccount'))}
                        onSubmit={onRegister}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-6">
            <AuthEmailOtpFlow session={session} busy={busy} setBusy={setBusy} sessionRefresh={sessionRefresh} />
            {footer?.(session, sessionRefresh)}
        </div>
    );
}
