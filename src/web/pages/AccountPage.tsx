import { startRegistration } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';
import { Link } from '@tanstack/react-router';
import { KeyRoundIcon, LogOutIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode, SubmitEventHandler } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { DEFAULT_TIME_ZONE, formatDate, userDisplayName } from '../../shared';
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
import { Button } from '../components/base/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/base/dialog';
import { Input } from '../components/base/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/base/input-otp';
import { Separator } from '../components/base/separator';
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
    AccountUserUpdateDocument,
} from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { useSessionUpdatesSeed } from '../hooks/useSessionUpdatesSeed';
import { useTimeZone } from '../hooks/useTimeZone';
import { useUserUpdatesSeed } from '../hooks/useUserUpdatesSeed';
import { redirectAfterSignOut } from '../utils/locale';
import { accountPageDescription, accountPageTitle } from './accountLabels';

export { accountPageDescription, accountPageTitle } from './accountLabels';

function emailAddressUpdateErrorMessage(error: unknown, locale: 'de' | 'en'): string {
    const message = error instanceof Error ? error.message : String(error ?? '');
    if (/invalid email|email unchanged/i.test(message)) {
        return { de: 'Bitte eine gültige neue E-Mail-Adresse eingeben.', en: 'Please enter a valid new email address.' }[locale];
    }
    if (/already registered/i.test(message)) {
        return {
            de: 'Diese E-Mail-Adresse ist bereits vergeben.',
            en: 'This email address is already in use.',
        }[locale];
    }
    if (/invalid or expired|too many attempt/i.test(message)) {
        return { de: 'Code ungültig oder abgelaufen.', en: 'Invalid or expired code.' }[locale];
    }
    return { de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale];
}

export function AccountPage({ loaderData }: { loaderData: GqlCAccountPageQuery }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const [busy, setBusy] = useState(false);
    const [profilePictureBusy, setProfilePictureBusy] = useState(false);
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [emailDraft, setEmailDraft] = useState('');
    const [emailError, setEmailError] = useState<string | null>(null);
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

    async function onEmailAddressUpdateOtpRequest() {
        setEmailError(null);
        setBusy(true);
        try {
            const result = await emailAddressUpdateOtpRequest({ emailAddress: emailDraft, locale });
            if (result.error || !result.data?.user.emailAddressUpdateOtpRequest.success) {
                throw result.error ?? new Error('Could not save.');
            }
            toast.success(
                {
                    de: 'Code gesendet. Bitte Posteingang und Spam-Ordner prüfen.',
                    en: 'Code sent. Please check your inbox and spam folder.',
                }[locale],
            );
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
            toast.success({ de: 'E-Mail-Adresse aktualisiert.', en: 'Email address updated.' }[locale]);
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
            toast.success({ de: 'Änderung verworfen.', en: 'Change discarded.' }[locale]);
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
                toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
                return;
            }
            toast.success({ de: 'Zeitzone gespeichert.', en: 'Time zone saved.' }[locale]);
        } catch {
            setTimeZoneDraft(previous);
            toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
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
            toast.success(
                {
                    de: 'Bevorzugte Kommunikation gespeichert.',
                    en: 'Preferred communication saved.',
                }[locale],
            );
        } catch {
            setPreferredCommunicationDraft(previous);
            toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
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
                toast.error({ de: 'Passkey konnte nicht erstellt werden.', en: 'Could not create a passkey.' }[locale]);
                return;
            }
            const credential = await startRegistration({ optionsJSON: options });
            const verifyResult = await registerVerify({ response: credential });
            if (verifyResult.error || !verifyResult.data?.user.authPasskeyRegisterVerify.success) {
                toast.error({ de: 'Passkey konnte nicht gespeichert werden.', en: 'Could not save the passkey.' }[locale]);
                return;
            }
            toast.success({ de: 'Passkey gespeichert.', en: 'Passkey saved.' }[locale]);
        } catch {
            toast.error({ de: 'Passkey-Registrierung abgebrochen.', en: 'Passkey registration cancelled.' }[locale]);
        } finally {
            setBusy(false);
        }
    }

    async function onPasskeyDelete(authPasskeyId: string) {
        setBusy(true);
        try {
            const result = await deletePasskey({ authPasskeyId });
            if (result.error || !result.data?.user.authPasskeyDelete.success) {
                toast.error({ de: 'Passkey konnte nicht entfernt werden.', en: 'Could not remove the passkey.' }[locale]);
                return;
            }
            toast.success({ de: 'Passkey entfernt.', en: 'Passkey removed.' }[locale]);
        } finally {
            setBusy(false);
        }
    }

    async function onTerminateSessions(sessionIds: string[], { signOut }: { signOut: boolean }) {
        setBusy(true);
        try {
            const result = await terminateSessions({ sessionIds });
            if (result.error || !result.data?.user.terminateSessions.success) {
                toast.error(
                    {
                        de: signOut ? 'Abmelden fehlgeschlagen.' : 'Gerät konnte nicht abgemeldet werden.',
                        en: signOut ? 'Sign-out failed.' : 'Could not sign out that device.',
                    }[locale],
                );
                return;
            }
            if (signOut) {
                toast.success({ de: 'Abgemeldet.', en: 'Signed out.' }[locale]);
                redirectAfterSignOut(locale);
                return;
            }
            toast.success({ de: 'Gerät abgemeldet.', en: 'Device signed out.' }[locale]);
        } finally {
            setBusy(false);
        }
    }

    async function onAccountDelete() {
        setBusy(true);
        try {
            const result = await anonymizeUser({});
            if (result.error || !result.data?.user.userAnonymize.success) {
                toast.error({ de: 'Konto konnte nicht gelöscht werden.', en: 'Could not delete the account.' }[locale]);
                return;
            }
            toast.success({ de: 'Konto gelöscht.', en: 'Account deleted.' }[locale]);
            redirectAfterSignOut(locale);
        } finally {
            setBusy(false);
        }
    }

    const otherSessionIds = sessions.filter((row) => !row.isCurrent).map((row) => row.sessionId);
    const actionBusy = busy || profilePictureBusy;

    return (
        <main id="main-content" className="mx-auto grid w-full max-w-3xl content-start gap-8">
            <div className="grid gap-2">
                <h1 className="font-serif text-4xl/tight text-foreground">{accountPageTitle[locale]}</h1>
                <p className="text-muted-foreground">{accountPageDescription[locale]}</p>
            </div>

            <AccountSection title={{ de: 'Profilbild', en: 'Profile picture' }[locale]}>
                <ProfilePictureEditor
                    profilePictureUrl={user.profilePicture?.url ?? null}
                    displayName={userDisplayName(user)}
                    disabled={busy}
                    onLink={onProfilePictureLink}
                    onClear={onProfilePictureClear}
                    onBusyChange={setProfilePictureBusy}
                />
            </AccountSection>

            <Separator />

            <AccountSection title={{ de: 'E-Mail', en: 'Email' }[locale]}>
                <p className="text-sm text-foreground">{currentEmailAddress}</p>
                {pendingUnverifiedOtp != null ? (
                    <div className="grid gap-3 rounded-xl border px-4 py-3">
                        <div className="grid gap-0.5">
                            <p className="text-sm text-foreground">
                                {
                                    {
                                        de: `Code ausstehend für ${pendingUnverifiedOtp.emailAddress}`,
                                        en: `Code pending for ${pendingUnverifiedOtp.emailAddress}`,
                                    }[locale]
                                }
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {{ de: 'Gib den Code aus der E-Mail ein.', en: 'Enter the code from the email.' }[locale]}
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={actionBusy}
                            onClick={() => void onEmailAddressUpdateOtpDiscard()}
                        >
                            {{ de: 'Änderung verwerfen', en: 'Discard change' }[locale]}
                        </Button>
                    </div>
                ) : (
                    <div className="flex justify-end">
                        <Button type="button" variant="outline" size="sm" disabled={actionBusy} onClick={openEmailDialog}>
                            {{ de: 'E-Mail ändern', en: 'Change email' }[locale]}
                        </Button>
                    </div>
                )}
            </AccountSection>

            <Separator />

            <AccountSection title={{ de: 'Kommunikation', en: 'Communication' }[locale]}>
                <PreferredCommunicationField
                    value={preferredCommunicationDraft}
                    onValueChange={(next) => void onPreferredCommunicationChange(next)}
                    disabled={actionBusy}
                    showTitle={false}
                />
            </AccountSection>

            <Separator />

            <AccountSection title={{ de: 'Sprache', en: 'Language' }[locale]}>
                <p className="text-sm text-muted-foreground">
                    {
                        {
                            de: 'Diese Sprache gilt für die Oberfläche und für E-Mails.',
                            en: 'This language applies to the interface and to emails.',
                        }[locale]
                    }
                </p>
                <LanguageSwitcher />
            </AccountSection>

            <Separator />

            <AccountSection title={{ de: 'Zeitzone', en: 'Time zone' }[locale]}>
                <TimeZoneField
                    value={timeZoneDraft}
                    onValueChange={(next) => void onTimeZoneChange(next)}
                    disabled={actionBusy}
                    showLabel={false}
                />
            </AccountSection>

            <Separator />

            <AccountSection title={{ de: 'Benachrichtigungen', en: 'Notifications' }[locale]}>
                <StubRow
                    label={{ de: 'E-Mail-Benachrichtigungen', en: 'Email notifications' }[locale]}
                    hint={{ de: 'Demnächst verfügbar', en: 'Coming soon' }[locale]}
                />
            </AccountSection>

            <Separator />

            <AccountSection title={{ de: 'Rechtliches', en: 'Legal' }[locale]}>
                <ul className="grid gap-2">
                    <li>
                        <Link to="/{-$locale}/privacy-policy" className="text-sm text-foreground underline-offset-4 hover:underline">
                            {{ de: 'Datenschutzerklärung', en: 'Privacy policy' }[locale]}
                        </Link>
                    </li>
                    <li>
                        <Link to="/{-$locale}/terms-and-conditions" className="text-sm text-foreground underline-offset-4 hover:underline">
                            {{ de: 'AGB', en: 'Terms and conditions' }[locale]}
                        </Link>
                    </li>
                    <li>
                        <Link to="/{-$locale}/imprint" className="text-sm text-foreground underline-offset-4 hover:underline">
                            {{ de: 'Impressum', en: 'Imprint' }[locale]}
                        </Link>
                    </li>
                </ul>
            </AccountSection>

            <Separator />

            <AccountSection title={{ de: 'Passkeys', en: 'Passkeys' }[locale]}>
                {passkeys.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {{ de: 'Noch keine Passkeys hinterlegt.', en: 'No passkeys registered yet.' }[locale]}
                    </p>
                ) : (
                    <ul className="divide-y divide-border overflow-hidden rounded-xl border">
                        {passkeys.map((passkey) => (
                            <li key={passkey.authPasskeyId} className="flex items-center justify-between gap-4 px-4 py-3">
                                <div className="grid min-w-0 gap-0.5">
                                    <p className="truncate text-sm text-foreground">
                                        {passkey.deviceType ?? { de: 'Passkey', en: 'Passkey' }[locale]}
                                        {passkey.backedUp ? { de: ' · gesichert', en: ' · backed up' }[locale] : ''}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDate(passkey.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                                    </p>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button type="button" variant="destructive" size="sm" disabled={actionBusy}>
                                            {{ de: 'Entfernen', en: 'Remove' }[locale]}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>
                                                {{ de: 'Passkey entfernen?', en: 'Remove this passkey?' }[locale]}
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {
                                                    {
                                                        de: 'Du kannst dich mit diesem Passkey nicht mehr anmelden. Andere Passkeys und Anmeldemethoden bleiben unverändert.',
                                                        en: 'You will no longer be able to sign in with this passkey. Other passkeys and sign-in methods stay unchanged.',
                                                    }[locale]
                                                }
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel disabled={actionBusy}>
                                                {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                                variant="destructive"
                                                disabled={actionBusy}
                                                onClick={() => void onPasskeyDelete(passkey.authPasskeyId)}
                                            >
                                                {{ de: 'Entfernen', en: 'Remove' }[locale]}
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
                        {{ de: 'Passkey hinzufügen', en: 'Add a passkey' }[locale]}
                    </Button>
                </div>
            </AccountSection>

            <Separator />

            <AccountSection title={{ de: 'Zwei-Faktor-Authentifizierung', en: 'Two-factor authentication' }[locale]}>
                <AuthTotpAccountSection totp={user.timeBasedOneTimePassword ?? null} actionBusy={actionBusy} />
            </AccountSection>

            <Separator />

            <AccountSection title={{ de: 'Gefahrenzone', en: 'Danger zone' }[locale]}>
                <div className="flex items-center justify-between gap-4 rounded-xl border border-destructive/30 px-4 py-3">
                    <div className="grid gap-0.5">
                        <p className="text-sm text-foreground">{{ de: 'Konto löschen', en: 'Delete account' }[locale]}</p>
                        <p className="text-xs text-muted-foreground">
                            {
                                {
                                    de: 'Personenbezogene Daten werden entfernt. Du kannst dich danach nicht mehr anmelden.',
                                    en: 'Personal profile data will be removed. You will not be able to sign in afterwards.',
                                }[locale]
                            }
                        </p>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button type="button" variant="destructive" size="sm" disabled={actionBusy}>
                                {{ de: 'Konto löschen', en: 'Delete account' }[locale]}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    {{ de: 'Konto wirklich löschen?', en: 'Delete your account permanently?' }[locale]}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    {
                                        {
                                            de: 'Diese Aktion kann nicht rückgängig gemacht werden. Deine persönlichen Daten werden entfernt und alle Geräte abgemeldet. Buchungsverläufe bleiben für Köche und den Betrieb erhalten, sind aber nicht mehr mit deiner Identität verknüpft.',
                                            en: 'This cannot be undone. Your personal data will be removed and all devices signed out. Booking history stays available for chefs and operations, but is no longer linked to your identity.',
                                        }[locale]
                                    }
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={actionBusy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                                <AlertDialogAction variant="destructive" disabled={actionBusy} onClick={() => void onAccountDelete()}>
                                    {{ de: 'Konto löschen', en: 'Delete account' }[locale]}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </AccountSection>

            <Separator />

            <AccountSection title={{ de: 'Angemeldete Geräte', en: 'Signed-in devices' }[locale]}>
                <ul className="divide-y divide-border overflow-hidden rounded-xl border">
                    {sessions.map((row) => (
                        <li key={row.sessionId} className="flex items-center justify-between gap-4 px-4 py-3">
                            <div className="grid min-w-0 gap-0.5">
                                <p className="truncate text-sm text-foreground">
                                    {row.isCurrent
                                        ? { de: 'Dieses Gerät', en: 'This device' }[locale]
                                        : (row.userAgent ?? { de: 'Anderes Gerät', en: 'Other device' }[locale])}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {
                                        {
                                            de: `Zuletzt aktiv ${formatDate(row.lastInteractionAt, { locale, timeZone, dateStyle: 'medium' })}`,
                                            en: `Last active ${formatDate(row.lastInteractionAt, { locale, timeZone, dateStyle: 'medium' })}`,
                                        }[locale]
                                    }
                                </p>
                            </div>
                            {row.isCurrent ? (
                                <span className="shrink-0 text-xs text-muted-foreground">{{ de: 'Aktuell', en: 'Current' }[locale]}</span>
                            ) : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={actionBusy}
                                    onClick={() => void onTerminateSessions([row.sessionId], { signOut: false })}
                                >
                                    {{ de: 'Abmelden', en: 'Sign out' }[locale]}
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
                <div className="flex flex-wrap flex-row-reverse justify-items-end gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button type="button" variant="destructive" disabled={actionBusy}>
                                <LogOutIcon />
                                {{ de: 'Abmelden', en: 'Sign out' }[locale]}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    {{ de: 'Auf diesem Gerät abmelden?', en: 'Sign out on this device?' }[locale]}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    {
                                        {
                                            de: 'Du wirst auf diesem Gerät abgemeldet und musst dich erneut anmelden, um auf dein Konto zuzugreifen.',
                                            en: 'You will be signed out on this device and will need to sign in again to access your account.',
                                        }[locale]
                                    }
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={actionBusy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                                <AlertDialogAction
                                    variant="destructive"
                                    disabled={actionBusy}
                                    onClick={() => void onTerminateSessions([currentSessionId], { signOut: true })}
                                >
                                    {{ de: 'Abmelden', en: 'Sign out' }[locale]}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    {otherSessionIds.length > 0 ? (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="destructive" disabled={actionBusy}>
                                    {{ de: 'Überall sonst abmelden', en: 'Sign out everywhere else' }[locale]}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        {{ de: 'Überall sonst abmelden?', en: 'Sign out everywhere else?' }[locale]}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {
                                            {
                                                de: 'Alle anderen Geräte und Browser werden abgemeldet. Dieses Gerät bleibt angemeldet.',
                                                en: 'All other devices and browsers will be signed out. This device stays signed in.',
                                            }[locale]
                                        }
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={actionBusy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                                    <AlertDialogAction
                                        variant="destructive"
                                        disabled={actionBusy}
                                        onClick={() => void onTerminateSessions(otherSessionIds, { signOut: false })}
                                    >
                                        {{ de: 'Überall sonst abmelden', en: 'Sign out everywhere else' }[locale]}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    ) : null}
                </div>
            </AccountSection>

            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                <DialogContent>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            void onEmailAddressUpdateOtpRequest();
                        }}
                    >
                        <DialogHeader>
                            <DialogTitle>{{ de: 'E-Mail-Adresse ändern', en: 'Change email address' }[locale]}</DialogTitle>
                            <DialogDescription>
                                {
                                    {
                                        de: 'Wir senden einen Bestätigungscode an die neue Adresse.',
                                        en: 'We will send a confirmation code to the new address.',
                                    }[locale]
                                }
                            </DialogDescription>
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
                                placeholder={{ de: 'neue@email.de', en: 'new@email.com' }[locale]}
                            />
                            {emailError != null ? <p className="text-sm text-destructive">{emailError}</p> : null}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" disabled={actionBusy} onClick={() => setEmailDialogOpen(false)}>
                                {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                            </Button>
                            <Button type="submit" disabled={actionBusy}>
                                {{ de: actionBusy ? 'Sendet…' : 'Code senden', en: actionBusy ? 'Sending…' : 'Send code' }[locale]}
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
                            <DialogTitle>{{ de: 'Code eingeben', en: 'Enter code' }[locale]}</DialogTitle>
                            <DialogDescription>
                                {
                                    {
                                        de: `Wir haben einen Code an ${pendingUnverifiedOtp?.emailAddress ?? ''} gesendet.`,
                                        en: `We sent a code to ${pendingUnverifiedOtp?.emailAddress ?? ''}.`,
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
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => void onEmailAddressUpdateOtpDiscard()}
                                disabled={actionBusy}
                            >
                                {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                            </Button>
                            <Button type="submit" disabled={actionBusy || otpCode.length !== 6}>
                                {{ de: 'Bestätigen', en: 'Verify' }[locale]}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </main>
    );
}

function AccountSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="grid gap-3">
            <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>
            <div className="grid gap-3">{children}</div>
        </section>
    );
}

function StubRow({ label, hint, destructive }: { label: string; hint: string; destructive?: boolean }) {
    return (
        <div
            className={
                destructive
                    ? 'flex items-center justify-between gap-4 rounded-xl border border-destructive/30 px-4 py-3'
                    : 'flex items-center justify-between gap-4 rounded-xl border px-4 py-3'
            }
        >
            <div className="grid gap-0.5">
                <p className="text-sm text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
            <Button type="button" variant={destructive ? 'destructive' : 'outline'} size="sm" disabled>
                {hint}
            </Button>
        </div>
    );
}
