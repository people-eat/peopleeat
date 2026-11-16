import { startRegistration } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';
import { Link } from '@tanstack/react-router';
import { KeyRoundIcon, LogOutIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode, SubmitEventHandler } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../i18n/t';
import { DEFAULT_TIME_ZONE, formatDate, phoneNumberNormalize, userDisplayName } from '../../shared';
import type { Locale } from '../../shared';
import { AccountNotificationSettings } from '../components/AccountNotificationSettings';
import { AuthEmailOtpSpamHint } from '../components/auth/AuthEmailOtpSpamHint';
import { AuthTotpAccountSection } from '../components/auth/AuthTotpAccountSection';
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
} from '../components/base/alert-dialog';
import { Badge } from '../components/base/badge';
import { Button } from '../components/base/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/base/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/base/dialog';
import { Input } from '../components/base/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/base/input-otp';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { PreferredCommunicationField } from '../components/PreferredCommunicationField';
import { ProfilePictureEditor } from '../components/ProfilePictureEditor';
import { TimeZoneField } from '../components/TimeZoneField';
import type { GqlCAccountPageQuery, GqlCUserPreferredCommunication } from '../graphql/generated';
import {
    AccountAuthEmailOtpDeleteDocument,
    AccountAuthPasskeyDeleteDocument,
    AccountAuthPasskeyRegisterOptionsDocument,
    AccountAuthPasskeyRegisterVerifyDocument,
    AccountEmailAddressUpdateOtpRequestDocument,
    AccountEmailAddressUpdateOtpVerifyDocument,
    AccountPageSessionUpdatesDocument,
    AccountPageUserUpdatesDocument,
    AccountTerminateSessionsDocument,
    AccountUserAnonymizeDocument,
    AccountUserAnonymizeOtpRequestDocument,
    AccountUserUpdateDocument,
} from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { useSessionUpdatesSeed } from '../hooks/useSessionUpdatesSeed';
import { useTimeZone } from '../hooks/useTimeZone';
import { useUserUpdatesSeed } from '../hooks/useUserUpdatesSeed';
import { redirectAfterSignOut } from '../utils/locale';
import { sessionDeviceLabel } from '../utils/sessionDeviceLabel';
import { accountPageTitle } from './accountLabels';

export { accountPageDescription, accountPageTitle } from './accountLabels';

function emailAddressUpdateErrorMessage(error: unknown, locale: Locale): string {
    const message = error instanceof Error ? error.message : String(error ?? '');
    if (/invalid email|email unchanged/i.test(message)) {
        return t(locale, 'profile', 'account.errors.invalidEmail');
    }
    if (/already registered/i.test(message)) {
        return t(locale, 'profile', 'account.errors.emailTaken');
    }
    if (/invalid or expired|too many attempt/i.test(message)) {
        return t(locale, 'profile', 'account.errors.invalidOrExpiredCode');
    }
    return t(locale, 'common', 'saveFailed');
}

function phoneNumberUpdateErrorMessage(error: unknown, locale: Locale): string {
    const message = error instanceof Error ? error.message : String(error ?? '');
    if (/already registered/i.test(message)) {
        return t(locale, 'profile', 'account.errors.phoneTaken');
    }
    if (/phoneNumber|E\.164/i.test(message)) {
        return t(locale, 'profile', 'account.errors.invalidPhone');
    }
    return t(locale, 'common', 'saveFailed');
}

export function AccountPage({ loaderData }: { loaderData: GqlCAccountPageQuery }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const [busy, setBusy] = useState(false);
    const [profilePictureBusy, setProfilePictureBusy] = useState(false);
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [emailDraft, setEmailDraft] = useState('');
    const [emailError, setEmailError] = useState<string | null>(null);
    const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
    const [phoneDraft, setPhoneDraft] = useState('');
    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteStep, setDeleteStep] = useState<'confirm' | 'code'>('confirm');
    const [deleteCode, setDeleteCode] = useState('');
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [otpCode, setOtpCode] = useState('');
    const otpVerifyStarted = useRef(false);

    const [, userUpdate] = useMutation(AccountUserUpdateDocument);
    const [, emailAddressUpdateOtpRequest] = useMutation(AccountEmailAddressUpdateOtpRequestDocument);
    const [, emailAddressUpdateOtpVerify] = useMutation(AccountEmailAddressUpdateOtpVerifyDocument);
    const [, authEmailOtpDelete] = useMutation(AccountAuthEmailOtpDeleteDocument);
    const [, registerOptions] = useMutation(AccountAuthPasskeyRegisterOptionsDocument);
    const [, registerVerify] = useMutation(AccountAuthPasskeyRegisterVerifyDocument);
    const [, deletePasskey] = useMutation(AccountAuthPasskeyDeleteDocument);
    const [, terminateSessions] = useMutation(AccountTerminateSessionsDocument);
    const [, anonymizeOtpRequest] = useMutation(AccountUserAnonymizeOtpRequestDocument);
    const [, anonymizeUser] = useMutation(AccountUserAnonymizeDocument);

    const seedSession = loaderData.currentSession;
    const session = useSessionUpdatesSeed(seedSession, AccountPageSessionUpdatesDocument);
    const seedUser = seedSession.user ?? null;
    const userFromUserUpdates = useUserUpdatesSeed(seedUser, AccountPageUserUpdatesDocument);
    const user = userFromUserUpdates ?? session?.user ?? null;
    const currentSessionId = session?.sessionId ?? seedSession.sessionId;
    const pendingEmailOtp = session?.authEmailOtp ?? null;
    const pendingUnverifiedOtp = pendingEmailOtp != null && pendingEmailOtp.verifiedAt == null ? pendingEmailOtp : null;
    const [preferredCommunicationDraft, setPreferredCommunicationDraft] = useState<GqlCUserPreferredCommunication | ''>(
        seedUser?.preferredCommunication ?? '',
    );
    const [timeZoneDraft, setTimeZoneDraft] = useState(seedUser?.timeZone ?? DEFAULT_TIME_ZONE);

    useEffect(() => {
        setPreferredCommunicationDraft(user?.preferredCommunication ?? '');
    }, [user?.preferredCommunication]);

    useEffect(() => {
        if (user?.timeZone) {
            setTimeZoneDraft(user.timeZone);
        }
    }, [user?.timeZone]);

    if (!user) {
        return null;
    }

    const currentEmailAddress = user.emailAddress ?? '';
    const phoneNumber = user.phoneNumber ?? '';
    const sessions = user.sessions ?? [];
    const passkeys = user.passkeys ?? [];

    async function onProfilePictureLink(fileUploadId: string) {
        const result = await userUpdate({ user: { profilePictureFileUploadId: fileUploadId } });
        if (result.error || !result.data?.user.userUpdate.success) {
            throw result.error ?? new Error('Could not save.');
        }
    }

    async function onProfilePictureClear() {
        const result = await userUpdate({ user: { profilePictureFileUploadId: null } });
        if (result.error || !result.data?.user.userUpdate.success) {
            throw result.error ?? new Error('Could not save.');
        }
    }

    function openEmailDialog() {
        setEmailDraft(currentEmailAddress);
        setEmailError(null);
        setEmailDialogOpen(true);
    }

    function openPhoneDialog() {
        setPhoneDraft(phoneNumber);
        setPhoneError(null);
        setPhoneDialogOpen(true);
    }

    async function onPhoneNumberSave() {
        setPhoneError(null);
        const normalized = phoneNumberNormalize(phoneDraft);
        if (!normalized) {
            setPhoneError(t(locale, 'profile', 'account.errors.invalidPhone'));
            return;
        }
        if (normalized === phoneNumber) {
            setPhoneDialogOpen(false);
            return;
        }
        setBusy(true);
        try {
            const result = await userUpdate({ user: { phoneNumber: normalized } });
            if (result.error || !result.data?.user.userUpdate.success) {
                throw result.error ?? new Error('Could not save.');
            }
            toast.success(t(locale, 'profile', 'account.toasts.phoneSaved'));
            const addingPhone = phoneNumber.length === 0;
            const whatsAppOn = user != null && Object.values(user.notificationSettings).some((row) => row.whatsApp);
            if (addingPhone && whatsAppOn) {
                toast.success(t(locale, 'profile', 'account.toasts.whatsappOn'));
            }
            setPhoneDialogOpen(false);
        } catch (error) {
            setPhoneError(phoneNumberUpdateErrorMessage(error, locale));
        } finally {
            setBusy(false);
        }
    }

    async function onEmailAddressUpdateOtpRequest() {
        setEmailError(null);
        setBusy(true);
        try {
            const result = await emailAddressUpdateOtpRequest({ emailAddress: emailDraft, locale });
            if (result.error || !result.data?.user.emailAddressUpdateOtpRequest.success) {
                throw result.error ?? new Error('Could not save.');
            }
            toast.success(t(locale, 'profile', 'account.toasts.codeSent'));
            setEmailDialogOpen(false);
            setOtpCode('');
            otpVerifyStarted.current = false;
        } catch (error) {
            setEmailError(emailAddressUpdateErrorMessage(error, locale));
        } finally {
            setBusy(false);
        }
    }

    async function onEmailAddressUpdateOtpVerify(code: string = otpCode) {
        if (!pendingUnverifiedOtp || code.length !== 6 || busy || otpVerifyStarted.current) return;
        otpVerifyStarted.current = true;
        setBusy(true);
        try {
            const result = await emailAddressUpdateOtpVerify({ code });
            if (result.error || !result.data?.user.emailAddressUpdateOtpVerify.success) {
                throw result.error ?? new Error('Could not save.');
            }
            toast.success(t(locale, 'profile', 'account.toasts.emailUpdated'));
            setOtpCode('');
        } catch (error) {
            otpVerifyStarted.current = false;
            toast.error(emailAddressUpdateErrorMessage(error, locale));
        } finally {
            setBusy(false);
        }
    }

    const onOtpVerifySubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();
        void onEmailAddressUpdateOtpVerify();
    };

    async function onEmailAddressUpdateOtpDiscard() {
        if (!pendingUnverifiedOtp) return;
        otpVerifyStarted.current = false;
        setBusy(true);
        try {
            const result = await authEmailOtpDelete({ authEmailOtpId: pendingUnverifiedOtp.authEmailOtpId });
            if (result.error || !result.data?.authEmailOtpDelete.success) {
                throw result.error ?? new Error('Could not save.');
            }
            setOtpCode('');
            toast.success(t(locale, 'profile', 'account.toasts.changeDiscarded'));
        } catch (error) {
            toast.error(emailAddressUpdateErrorMessage(error, locale));
        } finally {
            setBusy(false);
        }
    }

    async function onTimeZoneChange(nextTimeZone: string) {
        if (nextTimeZone === timeZoneDraft) return;
        const previous = timeZoneDraft;
        setTimeZoneDraft(nextTimeZone);
        setBusy(true);
        try {
            const result = await userUpdate({ user: { timeZone: nextTimeZone } });
            if (result.error || !result.data?.user.userUpdate.success) {
                setTimeZoneDraft(previous);
                toast.error(t(locale, 'common', 'saveFailed'));
                return;
            }
            toast.success(t(locale, 'profile', 'account.toasts.timeZoneSaved'));
        } catch {
            setTimeZoneDraft(previous);
            toast.error(t(locale, 'common', 'saveFailed'));
        } finally {
            setBusy(false);
        }
    }

    async function onPreferredCommunicationChange(preferredCommunication: GqlCUserPreferredCommunication) {
        if (preferredCommunication === preferredCommunicationDraft) return;
        const previous = preferredCommunicationDraft;
        setPreferredCommunicationDraft(preferredCommunication);
        setBusy(true);
        try {
            const result = await userUpdate({ user: { preferredCommunication } });
            if (result.error || !result.data?.user.userUpdate.success) {
                throw result.error ?? new Error('Could not save.');
            }
            toast.success(t(locale, 'profile', 'account.toasts.preferredCommunicationSaved'));
        } catch {
            setPreferredCommunicationDraft(previous);
            toast.error(t(locale, 'common', 'saveFailed'));
        } finally {
            setBusy(false);
        }
    }

    async function onPasskeyRegister() {
        setBusy(true);
        try {
            const optionsResult = await registerOptions({});
            const options = optionsResult.data?.user.authPasskeyRegisterOptions as PublicKeyCredentialCreationOptionsJSON | undefined;
            if (optionsResult.error || !options) {
                toast.error(t(locale, 'profile', 'account.toasts.passkeyCreateFailed'));
                return;
            }
            const credential = await startRegistration({ optionsJSON: options });
            const verifyResult = await registerVerify({ response: credential });
            if (verifyResult.error || !verifyResult.data?.user.authPasskeyRegisterVerify.success) {
                toast.error(t(locale, 'profile', 'account.toasts.passkeySaveFailed'));
                return;
            }
            toast.success(t(locale, 'profile', 'account.toasts.passkeySaved'));
        } catch {
            toast.error(t(locale, 'profile', 'account.toasts.passkeyCancelled'));
        } finally {
            setBusy(false);
        }
    }

    async function onPasskeyDelete(authPasskeyId: string) {
        setBusy(true);
        try {
            const result = await deletePasskey({ authPasskeyId });
            if (result.error || !result.data?.user.authPasskeyDelete.success) {
                toast.error(t(locale, 'profile', 'account.toasts.passkeyRemoveFailed'));
                return;
            }
            toast.success(t(locale, 'profile', 'account.toasts.passkeyRemoved'));
        } finally {
            setBusy(false);
        }
    }

    async function onTerminateSessions(sessionIds: string[], { signOut }: { signOut: boolean }) {
        setBusy(true);
        try {
            const result = await terminateSessions({ sessionIds });
            if (result.error || !result.data?.user.terminateSessions.success) {
                toast.error(t(locale, 'profile', signOut ? 'account.toasts.signOutFailed' : 'account.toasts.deviceSignOutFailed'));
                return;
            }
            if (signOut) {
                toast.success(t(locale, 'profile', 'account.toasts.signedOut'));
                redirectAfterSignOut(locale);
                return;
            }
            toast.success(t(locale, 'profile', 'account.toasts.deviceSignedOut'));
        } finally {
            setBusy(false);
        }
    }

    function openDeleteDialog() {
        setDeleteStep('confirm');
        setDeleteCode('');
        setDeleteError(null);
        setDeleteDialogOpen(true);
    }

    async function onAccountDeleteOtpRequest() {
        setDeleteError(null);
        setBusy(true);
        try {
            const result = await anonymizeOtpRequest({ locale });
            if (result.error || !result.data?.user.userAnonymizeOtpRequest.success) {
                throw result.error ?? new Error('Could not save.');
            }
            setDeleteCode('');
            setDeleteStep('code');
            toast.success(t(locale, 'profile', 'account.toasts.codeSent'));
        } catch (error) {
            setDeleteError(emailAddressUpdateErrorMessage(error, locale));
        } finally {
            setBusy(false);
        }
    }

    async function onAccountDelete() {
        if (deleteCode.length !== 6 || busy) return;
        setDeleteError(null);
        setBusy(true);
        try {
            const result = await anonymizeUser({ code: deleteCode });
            if (result.error || !result.data?.user.userAnonymize.success) {
                throw result.error ?? new Error('Could not save.');
            }
            toast.success(t(locale, 'profile', 'account.toasts.accountDeleted'));
            redirectAfterSignOut(locale);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error ?? '');
            if (/invalid or expired|too many attempt/i.test(message)) {
                setDeleteError(t(locale, 'profile', 'account.errors.invalidOrExpiredCode'));
            } else {
                setDeleteError(t(locale, 'profile', 'account.errors.deleteFailed'));
            }
        } finally {
            setBusy(false);
        }
    }

    const otherSessionIds = sessions.filter((row) => !row.isCurrent).map((row) => row.sessionId);
    const actionBusy = busy || profilePictureBusy;
    const hasPhoneNumber = phoneNumber.length > 0;
    const phoneNumberLabel = hasPhoneNumber ? phoneNumber : t(locale, 'profile', 'account.noPhone');
    const birthDateLabel = user.birthDate
        ? formatDate(user.birthDate, { locale, dateStyle: 'long' })
        : t(locale, 'profile', 'account.notSet');
    const registeredLabel = formatDate(user.createdAt, { locale, timeZone, dateStyle: 'long' });

    return (
        <main id="main-content" className="mx-auto grid w-full max-w-3xl content-start gap-6">
            <h1 className="sr-only">{accountPageTitle(locale)}</h1>

            <Card className="bg-card">
                <CardContent>
                    <ProfilePictureEditor
                        profilePictureUrl={user.profilePicture?.url ?? null}
                        displayName={userDisplayName(user)}
                        disabled={busy}
                        onLink={onProfilePictureLink}
                        onClear={onProfilePictureClear}
                        onBusyChange={setProfilePictureBusy}
                    >
                        <p className="truncate text-base text-foreground">
                            {user.firstName} {user.lastName}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                            {user.birthDate != null
                                ? t(locale, 'profile', 'account.bornOn', { date: birthDateLabel })
                                : t(locale, 'profile', 'account.noBirthDate')}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {t(locale, 'profile', 'account.registeredOn', { date: registeredLabel })}
                        </p>
                    </ProfilePictureEditor>
                </CardContent>
            </Card>

            <AccountCard
                title={t(locale, 'profile', 'account.contact.title')}
                description={t(locale, 'profile', 'account.contact.description')}
            >
                <AccountValueRow
                    label={t(locale, 'profile', 'account.contact.email')}
                    value={currentEmailAddress}
                    action={
                        pendingUnverifiedOtp == null ? (
                            <Button type="button" variant="outline" size="sm" disabled={actionBusy} onClick={openEmailDialog}>
                                {t(locale, 'profile', 'account.contact.changeEmail')}
                            </Button>
                        ) : null
                    }
                />
                {pendingUnverifiedOtp != null ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
                        <div className="grid min-w-0 gap-0.5">
                            <p className="text-sm text-foreground">
                                {t(locale, 'profile', 'account.contact.codePending', { email: pendingUnverifiedOtp.emailAddress })}
                            </p>
                            <p className="text-xs text-muted-foreground">{t(locale, 'profile', 'account.contact.enterEmailCode')}</p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={actionBusy}
                            onClick={() => void onEmailAddressUpdateOtpDiscard()}
                        >
                            {t(locale, 'profile', 'account.contact.discardChange')}
                        </Button>
                    </div>
                ) : null}
                <AccountValueRow
                    label={t(locale, 'profile', 'account.contact.phone')}
                    value={phoneNumberLabel}
                    muted={!hasPhoneNumber}
                    action={
                        <Button type="button" variant="outline" size="sm" disabled={actionBusy} onClick={openPhoneDialog}>
                            {hasPhoneNumber
                                ? t(locale, 'profile', 'account.contact.changeNumber')
                                : t(locale, 'profile', 'account.contact.addNumber')}
                        </Button>
                    }
                />
                <PreferredCommunicationField
                    value={preferredCommunicationDraft}
                    onValueChange={(next) => void onPreferredCommunicationChange(next)}
                    disabled={actionBusy}
                    showSubtitle={false}
                    title={t(locale, 'profile', 'account.contact.conciergeTitle')}
                />

                <div className="grid gap-2">
                    <p className="text-sm font-medium text-foreground">{t(locale, 'profile', 'account.language.title')}</p>
                    <p className="text-sm text-muted-foreground">{t(locale, 'profile', 'account.language.description')}</p>
                    <LanguageSwitcher />
                </div>
                <TimeZoneField value={timeZoneDraft} onValueChange={(next) => void onTimeZoneChange(next)} disabled={actionBusy} />
            </AccountCard>

            <AccountCard
                title={t(locale, 'profile', 'account.notifications.title')}
                description={t(locale, 'profile', 'account.notifications.description')}
            >
                <AccountNotificationSettings
                    value={user.notificationSettings}
                    hasPhoneNumber={hasPhoneNumber}
                    isCook={user.cook != null}
                    disabled={actionBusy}
                    onAddPhone={openPhoneDialog}
                    onSave={async (notificationSettings) => {
                        setBusy(true);
                        try {
                            const result = await userUpdate({ user: { notificationSettings } });
                            if (result.error || !result.data?.user.userUpdate.success) {
                                throw result.error ?? new Error('Could not save.');
                            }
                        } finally {
                            setBusy(false);
                        }
                    }}
                />
            </AccountCard>

            <AccountCard
                title={t(locale, 'profile', 'account.delete.action')}
                description={t(locale, 'profile', 'account.delete.description')}
            >
                <div className="flex justify-end">
                    <Button type="button" variant="destructive" size="sm" disabled={actionBusy} onClick={openDeleteDialog}>
                        {t(locale, 'profile', 'account.delete.action')}
                    </Button>
                </div>
            </AccountCard>

            <AccountCard title={t(locale, 'profile', 'account.security.title')}>
                <div className="grid gap-3">
                    <h2 className="text-sm font-medium text-foreground">{t(locale, 'profile', 'account.security.passkeys')}</h2>
                    {passkeys.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t(locale, 'profile', 'account.security.passkeysHint')}</p>
                    ) : (
                        <ul className="divide-y divide-border overflow-hidden rounded-xl border bg-card">
                            {passkeys.map((passkey) => (
                                <li key={passkey.authPasskeyId} className="flex items-center justify-between gap-4 bg-card px-4 py-3">
                                    <div className="grid min-w-0 gap-0.5">
                                        <p className="truncate text-sm text-foreground">
                                            {passkey.deviceType ?? t(locale, 'profile', 'account.security.passkeyFallback')}
                                            {passkey.backedUp ? t(locale, 'profile', 'account.security.backedUp') : ''}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDate(passkey.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                                        </p>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button type="button" variant="destructive" size="sm" disabled={actionBusy}>
                                                {t(locale, 'profile', 'account.security.remove')}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>{t(locale, 'profile', 'account.security.removeTitle')}</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    {t(locale, 'profile', 'account.security.removeBody')}
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel disabled={actionBusy}>{t(locale, 'common', 'cancel')}</AlertDialogCancel>
                                                <AlertDialogAction
                                                    variant="destructive"
                                                    disabled={actionBusy}
                                                    onClick={() => void onPasskeyDelete(passkey.authPasskeyId)}
                                                >
                                                    {t(locale, 'profile', 'account.security.remove')}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="flex justify-end">
                        <Button type="button" variant="outline" disabled={actionBusy} onClick={() => void onPasskeyRegister()}>
                            <KeyRoundIcon />
                            {t(locale, 'profile', 'account.security.addPasskey')}
                        </Button>
                    </div>
                </div>
                <div className="grid gap-3">
                    <h2 className="text-sm font-medium text-foreground">{t(locale, 'profile', 'account.security.totp')}</h2>
                    <AuthTotpAccountSection totp={user.timeBasedOneTimePassword ?? null} actionBusy={actionBusy} />
                </div>

                <div className="grid gap-3">
                    <h2 className="text-sm font-medium text-foreground">{t(locale, 'profile', 'account.security.devices')}</h2>
                    <ul className="divide-y divide-border overflow-hidden rounded-xl border bg-card">
                        {sessions.map((row) => {
                            const deviceLabel = sessionDeviceLabel(row.userAgent, locale);
                            return (
                                <li key={row.sessionId} className="flex items-center justify-between gap-4 bg-card px-4 py-3">
                                    <div className="grid min-w-0 gap-0.5">
                                        <p className="truncate text-sm text-foreground">{deviceLabel}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {t(locale, 'profile', 'account.security.lastActive', {
                                                date: formatDate(row.lastInteractionAt, { locale, timeZone, dateStyle: 'medium' }),
                                            })}
                                        </p>
                                    </div>
                                    {row.isCurrent ? (
                                        <Badge variant="outline">{t(locale, 'profile', 'account.security.thisDevice')}</Badge>
                                    ) : (
                                        <AccountSignOutDialog
                                            disabled={actionBusy}
                                            title={t(locale, 'profile', 'account.security.signOutDeviceTitle', { device: deviceLabel })}
                                            description={t(locale, 'profile', 'account.security.signOutDeviceBody', {
                                                device: deviceLabel,
                                            })}
                                            confirmLabel={t(locale, 'profile', 'account.security.signOut')}
                                            onConfirm={() => void onTerminateSessions([row.sessionId], { signOut: false })}
                                            trigger={
                                                <Button type="button" variant="outline" size="sm" disabled={actionBusy}>
                                                    {t(locale, 'profile', 'account.security.signOut')}
                                                </Button>
                                            }
                                        />
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    <div className="flex flex-wrap justify-end gap-2">
                        {otherSessionIds.length > 0 ? (
                            <AccountSignOutDialog
                                disabled={actionBusy}
                                title={t(locale, 'profile', 'account.security.signOutEverywhereTitle')}
                                description={t(locale, 'profile', 'account.security.signOutEverywhereBody')}
                                confirmLabel={t(locale, 'profile', 'account.security.signOutEverywhere')}
                                onConfirm={() => void onTerminateSessions(otherSessionIds, { signOut: false })}
                                trigger={
                                    <Button type="button" variant="outline" disabled={actionBusy}>
                                        {t(locale, 'profile', 'account.security.signOutEverywhere')}
                                    </Button>
                                }
                            />
                        ) : null}
                        <AccountSignOutDialog
                            disabled={actionBusy}
                            title={t(locale, 'profile', 'account.security.signOutThisTitle')}
                            description={t(locale, 'profile', 'account.security.signOutThisBody')}
                            confirmLabel={t(locale, 'profile', 'account.security.signOut')}
                            onConfirm={() => void onTerminateSessions([currentSessionId], { signOut: true })}
                            trigger={
                                <Button type="button" variant="outline" disabled={actionBusy}>
                                    <LogOutIcon />
                                    {t(locale, 'profile', 'account.security.signOut')}
                                </Button>
                            }
                        />
                    </div>
                </div>
            </AccountCard>

            <nav className="flex flex-wrap gap-x-4 gap-y-2 px-1 text-sm text-muted-foreground">
                <Link to="/{-$locale}/privacy-policy" className="underline-offset-4 hover:text-foreground hover:underline">
                    {t(locale, 'profile', 'account.legal.privacy')}
                </Link>
                <Link to="/{-$locale}/terms-and-conditions" className="underline-offset-4 hover:text-foreground hover:underline">
                    {t(locale, 'profile', 'account.legal.terms')}
                </Link>
                <Link to="/{-$locale}/imprint" className="underline-offset-4 hover:text-foreground hover:underline">
                    {t(locale, 'profile', 'account.legal.imprint')}
                </Link>
            </nav>

            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                <DialogContent>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            void onEmailAddressUpdateOtpRequest();
                        }}
                    >
                        <DialogHeader>
                            <DialogTitle>{t(locale, 'profile', 'account.emailDialog.title')}</DialogTitle>
                            <DialogDescription>{t(locale, 'profile', 'account.emailDialog.description')}</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-2 py-4">
                            <Input
                                type="email"
                                name="email"
                                autoComplete="email"
                                required
                                value={emailDraft}
                                disabled={actionBusy}
                                onChange={(event) => setEmailDraft(event.target.value)}
                                placeholder={t(locale, 'profile', 'account.emailDialog.placeholder')}
                            />
                            {emailError != null ? <p className="text-sm text-destructive">{emailError}</p> : null}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" disabled={actionBusy} onClick={() => setEmailDialogOpen(false)}>
                                {t(locale, 'common', 'cancel')}
                            </Button>
                            <Button type="submit" disabled={actionBusy}>
                                {t(locale, 'profile', actionBusy ? 'actions.sending' : 'actions.sendCode')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={pendingUnverifiedOtp != null}
                onOpenChange={(open) => {
                    if (!open) void onEmailAddressUpdateOtpDiscard();
                    else otpVerifyStarted.current = false;
                }}
            >
                <DialogContent showCloseButton={false}>
                    <form className="grid gap-4" onSubmit={onOtpVerifySubmit}>
                        <DialogHeader>
                            <DialogTitle>{t(locale, 'profile', 'account.emailDialog.enterCode')}</DialogTitle>
                            <DialogDescription>
                                {t(locale, 'profile', 'account.emailDialog.codeSentTo', {
                                    email: pendingUnverifiedOtp?.emailAddress ?? '',
                                })}
                            </DialogDescription>
                        </DialogHeader>
                        <AuthEmailOtpSpamHint />
                        <div className="flex justify-center py-2">
                            <InputOTP
                                maxLength={6}
                                value={otpCode}
                                onChange={(next) => {
                                    otpVerifyStarted.current = false;
                                    setOtpCode(next);
                                }}
                                onComplete={(next) => {
                                    void onEmailAddressUpdateOtpVerify(next);
                                }}
                                autoComplete="one-time-code"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                disabled={actionBusy}
                                aria-label={t(locale, 'profile', 'account.emailDialog.codeAria')}
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
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => void onEmailAddressUpdateOtpDiscard()}
                                disabled={actionBusy}
                            >
                                {t(locale, 'common', 'cancel')}
                            </Button>
                            <Button type="submit" disabled={actionBusy || otpCode.length !== 6}>
                                {t(locale, 'profile', 'actions.verify')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                    setDeleteDialogOpen(open);
                    if (!open) {
                        setDeleteStep('confirm');
                        setDeleteCode('');
                        setDeleteError(null);
                    }
                }}
            >
                <DialogContent>
                    {deleteStep === 'confirm' ? (
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                void onAccountDeleteOtpRequest();
                            }}
                        >
                            <DialogHeader>
                                <DialogTitle>{t(locale, 'profile', 'account.delete.confirmTitle')}</DialogTitle>
                                <DialogDescription>{t(locale, 'profile', 'account.delete.confirmBody')}</DialogDescription>
                            </DialogHeader>
                            {deleteError != null ? <p className="py-4 text-sm text-destructive">{deleteError}</p> : null}
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" disabled={actionBusy} onClick={() => setDeleteDialogOpen(false)}>
                                    {t(locale, 'common', 'cancel')}
                                </Button>
                                <Button type="submit" variant="destructive" disabled={actionBusy}>
                                    {t(locale, 'profile', actionBusy ? 'actions.sending' : 'actions.sendCode')}
                                </Button>
                            </DialogFooter>
                        </form>
                    ) : (
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                void onAccountDelete();
                            }}
                        >
                            <DialogHeader>
                                <DialogTitle>{t(locale, 'profile', 'account.emailDialog.enterCode')}</DialogTitle>
                                <DialogDescription>
                                    {t(locale, 'profile', 'account.emailDialog.codeSentTo', { email: currentEmailAddress })}
                                </DialogDescription>
                            </DialogHeader>
                            <AuthEmailOtpSpamHint />
                            <div className="flex justify-center py-4">
                                <InputOTP
                                    maxLength={6}
                                    value={deleteCode}
                                    onChange={setDeleteCode}
                                    autoComplete="one-time-code"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    disabled={actionBusy}
                                    aria-label={t(locale, 'profile', 'account.emailDialog.codeAria')}
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
                            {deleteError != null ? <p className="text-sm text-destructive">{deleteError}</p> : null}
                            <DialogFooter>
                                <Button type="button" variant="outline" disabled={actionBusy} onClick={() => setDeleteDialogOpen(false)}>
                                    {t(locale, 'common', 'cancel')}
                                </Button>
                                <Button type="submit" variant="destructive" disabled={actionBusy || deleteCode.length !== 6}>
                                    {t(locale, 'profile', 'account.delete.action')}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
                <DialogContent>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            void onPhoneNumberSave();
                        }}
                    >
                        <DialogHeader>
                            <DialogTitle>
                                {hasPhoneNumber
                                    ? t(locale, 'profile', 'account.phoneDialog.changeTitle')
                                    : t(locale, 'profile', 'account.phoneDialog.addTitle')}
                            </DialogTitle>
                            <DialogDescription>{t(locale, 'profile', 'account.phoneDialog.hint')}</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-2 py-4">
                            <Input
                                type="tel"
                                name="tel"
                                autoComplete="tel"
                                required
                                value={phoneDraft}
                                disabled={actionBusy}
                                onChange={(event) => setPhoneDraft(event.target.value)}
                                placeholder="+49…"
                                aria-invalid={phoneError != null || undefined}
                            />
                            {phoneError != null ? <p className="text-sm text-destructive">{phoneError}</p> : null}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" disabled={actionBusy} onClick={() => setPhoneDialogOpen(false)}>
                                {t(locale, 'common', 'cancel')}
                            </Button>
                            <Button type="submit" disabled={actionBusy}>
                                {actionBusy ? t(locale, 'profile', 'actions.saving') : t(locale, 'common', 'save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </main>
    );
}

function AccountSignOutDialog({
    trigger,
    title,
    description,
    confirmLabel,
    disabled,
    onConfirm,
}: {
    trigger: ReactNode;
    title: string;
    description: string;
    confirmLabel: string;
    disabled: boolean;
    onConfirm: () => void;
}) {
    const locale = useLocale();

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={disabled}>{t(locale, 'common', 'cancel')}</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" disabled={disabled} onClick={onConfirm}>
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function AccountCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <Card className="bg-card">
            <CardHeader>
                <CardTitle className="font-serif text-2xl font-normal">{title}</CardTitle>
                {description ? <CardDescription className="text-sm/relaxed">{description}</CardDescription> : null}
            </CardHeader>
            <CardContent className="grid gap-5">{children}</CardContent>
        </Card>
    );
}

function AccountValueRow({ label, value, muted = false, action }: { label: string; value: string; muted?: boolean; action?: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="grid min-w-0 gap-0.5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className={muted ? 'truncate text-sm text-muted-foreground' : 'truncate text-sm text-foreground'}>{value}</p>
            </div>
            {action}
        </div>
    );
}
