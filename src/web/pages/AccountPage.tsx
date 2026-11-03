import { startRegistration } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';
import { Link } from '@tanstack/react-router';
import { KeyRoundIcon, LogOutIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode, SubmitEventHandler } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { DEFAULT_TIME_ZONE, formatDate, phoneNumberNormalize, userDisplayName } from '../../shared';
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

function phoneNumberUpdateErrorMessage(error: unknown, locale: 'de' | 'en'): string {
    const message = error instanceof Error ? error.message : String(error ?? '');
    if (/already registered/i.test(message)) {
        return { de: 'Diese Nummer ist bereits vergeben.', en: 'This number is already in use.' }[locale];
    }
    if (/phoneNumber|E\.164/i.test(message)) {
        return {
            de: 'Bitte eine Nummer mit Ländervorwahl eingeben, zum Beispiel +49…',
            en: 'Enter a number with a country code, for example +49…',
        }[locale];
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
            setPhoneError(
                {
                    de: 'Bitte eine Nummer mit Ländervorwahl eingeben, zum Beispiel +49…',
                    en: 'Enter a number with a country code, for example +49…',
                }[locale],
            );
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
            toast.success({ de: 'Telefonnummer gespeichert.', en: 'Phone number saved.' }[locale]);
            const addingPhone = phoneNumber.length === 0;
            const whatsAppOn = user != null && Object.values(user.notificationSettings).some((row) => row.whatsApp);
            if (addingPhone && whatsAppOn) {
                toast.success(
                    {
                        de: 'WhatsApp ist für die Nachrichten unten an. Einzelne kannst du ausschalten.',
                        en: 'WhatsApp is on for the messages below. You can turn individual ones off.',
                    }[locale],
                );
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
            toast.success(
                {
                    de: 'Code gesendet. Bitte Posteingang und Spam-Ordner prüfen.',
                    en: 'Code sent. Please check your inbox and spam folder.',
                }[locale],
            );
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
            toast.success({ de: 'Konto gelöscht.', en: 'Account deleted.' }[locale]);
            redirectAfterSignOut(locale);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error ?? '');
            if (/invalid or expired|too many attempt/i.test(message)) {
                setDeleteError({ de: 'Code ungültig oder abgelaufen.', en: 'Invalid or expired code.' }[locale]);
            } else {
                setDeleteError({ de: 'Konto konnte nicht gelöscht werden.', en: 'Could not delete the account.' }[locale]);
            }
        } finally {
            setBusy(false);
        }
    }

    const otherSessionIds = sessions.filter((row) => !row.isCurrent).map((row) => row.sessionId);
    const actionBusy = busy || profilePictureBusy;
    const hasPhoneNumber = phoneNumber.length > 0;
    const phoneNumberLabel = hasPhoneNumber ? phoneNumber : { de: 'Keine Nummer hinterlegt', en: 'No number on file' }[locale];
    const birthDateLabel = user.birthDate
        ? formatDate(user.birthDate, { locale, dateStyle: 'long' })
        : { de: 'Nicht angegeben', en: 'Not set' }[locale];
    const registeredLabel = formatDate(user.createdAt, { locale, timeZone, dateStyle: 'long' });

    return (
        <main id="main-content" className="mx-auto grid w-full max-w-3xl content-start gap-6">
            <h1 className="sr-only">{accountPageTitle[locale]}</h1>

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
                                ? { de: `Geboren am ${birthDateLabel}`, en: `Born ${birthDateLabel}` }[locale]
                                : { de: 'Kein Geburtsdatum angegeben', en: 'No date of birth on file' }[locale]}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {{ de: `Registriert am ${registeredLabel}`, en: `Registered ${registeredLabel}` }[locale]}
                        </p>
                    </ProfilePictureEditor>
                </CardContent>
            </Card>

            <AccountCard
                title={{ de: 'So erreichen wir dich', en: 'How we reach you' }[locale]}
                description={
                    {
                        de: 'E-Mail und Telefon für dein Konto. Die Auswahl gilt für unseren Concierge, nicht für automatische Nachrichten.',
                        en: 'Your account email and phone. This choice is for our concierge, not for automatic messages.',
                    }[locale]
                }
            >
                <AccountValueRow
                    label={{ de: 'E-Mail-Adresse', en: 'Email address' }[locale]}
                    value={currentEmailAddress}
                    action={
                        pendingUnverifiedOtp == null ? (
                            <Button type="button" variant="outline" size="sm" disabled={actionBusy} onClick={openEmailDialog}>
                                {{ de: 'E-Mail ändern', en: 'Change email' }[locale]}
                            </Button>
                        ) : null
                    }
                />
                {pendingUnverifiedOtp != null ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
                        <div className="grid min-w-0 gap-0.5">
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
                ) : null}
                <AccountValueRow
                    label={{ de: 'Telefonnummer', en: 'Phone number' }[locale]}
                    value={phoneNumberLabel}
                    muted={!hasPhoneNumber}
                    action={
                        <Button type="button" variant="outline" size="sm" disabled={actionBusy} onClick={openPhoneDialog}>
                            {hasPhoneNumber
                                ? { de: 'Nummer ändern', en: 'Change number' }[locale]
                                : { de: 'Nummer hinzufügen', en: 'Add a number' }[locale]}
                        </Button>
                    }
                />
                <PreferredCommunicationField
                    value={preferredCommunicationDraft}
                    onValueChange={(next) => void onPreferredCommunicationChange(next)}
                    disabled={actionBusy}
                    showSubtitle={false}
                    title={{ de: 'Wie soll sich der Concierge melden?', en: 'How should the concierge reach you?' }}
                />

                <div className="grid gap-2">
                    <p className="text-sm font-medium text-foreground">{{ de: 'Sprache', en: 'Language' }[locale]}</p>
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Diese Sprache gilt für die Oberfläche, für E-Mails und für WhatsApp.',
                                en: 'This language applies to the interface, to emails, and to WhatsApp.',
                            }[locale]
                        }
                    </p>
                    <LanguageSwitcher />
                </div>
                <TimeZoneField value={timeZoneDraft} onValueChange={(next) => void onTimeZoneChange(next)} disabled={actionBusy} />
            </AccountCard>

            <AccountCard title={{ de: 'Anmeldung und Sicherheit', en: 'Sign-in and security' }[locale]}>
                <div className="grid gap-3">
                    <h2 className="text-sm font-medium text-foreground">{{ de: 'Passkeys', en: 'Passkeys' }[locale]}</h2>
                    {passkeys.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Melde dich das nächste Mal mit Face ID oder Fingerabdruck an, ohne Code.',
                                    en: 'Next time, sign in with Face ID or a fingerprint, without a code.',
                                }[locale]
                            }
                        </p>
                    ) : (
                        <ul className="divide-y divide-border overflow-hidden rounded-xl border bg-card">
                            {passkeys.map((passkey) => (
                                <li key={passkey.authPasskeyId} className="flex items-center justify-between gap-4 bg-card px-4 py-3">
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
                </div>
                <div className="grid gap-3">
                    <h2 className="text-sm font-medium text-foreground">
                        {{ de: 'Zwei-Faktor-Authentifizierung', en: 'Two-factor authentication' }[locale]}
                    </h2>
                    <AuthTotpAccountSection totp={user.timeBasedOneTimePassword ?? null} actionBusy={actionBusy} />
                </div>

                <div className="grid gap-3">
                    <h2 className="text-sm font-medium text-foreground">{{ de: 'Angemeldete Geräte', en: 'Signed-in devices' }[locale]}</h2>
                    <ul className="divide-y divide-border overflow-hidden rounded-xl border bg-card">
                        {sessions.map((row) => {
                            const deviceLabel = sessionDeviceLabel(row.userAgent, locale);
                            return (
                                <li key={row.sessionId} className="flex items-center justify-between gap-4 bg-card px-4 py-3">
                                    <div className="grid min-w-0 gap-0.5">
                                        <p className="truncate text-sm text-foreground">{deviceLabel}</p>
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
                                        <Badge variant="outline">{{ de: 'Dieses Gerät', en: 'This device' }[locale]}</Badge>
                                    ) : (
                                        <AccountSignOutDialog
                                            disabled={actionBusy}
                                            title={{ de: `${deviceLabel} abmelden?`, en: `Sign out ${deviceLabel}?` }[locale]}
                                            description={
                                                {
                                                    de: `${deviceLabel} wird abgemeldet. Dieses Gerät bleibt angemeldet.`,
                                                    en: `${deviceLabel} will be signed out. This device stays signed in.`,
                                                }[locale]
                                            }
                                            confirmLabel={{ de: 'Abmelden', en: 'Sign out' }[locale]}
                                            onConfirm={() => void onTerminateSessions([row.sessionId], { signOut: false })}
                                            trigger={
                                                <Button type="button" variant="outline" size="sm" disabled={actionBusy}>
                                                    {{ de: 'Abmelden', en: 'Sign out' }[locale]}
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
                                title={{ de: 'Überall sonst abmelden?', en: 'Sign out everywhere else?' }[locale]}
                                description={
                                    {
                                        de: 'Alle anderen Geräte und Browser werden abgemeldet. Dieses Gerät bleibt angemeldet.',
                                        en: 'All other devices and browsers will be signed out. This device stays signed in.',
                                    }[locale]
                                }
                                confirmLabel={{ de: 'Überall sonst abmelden', en: 'Sign out everywhere else' }[locale]}
                                onConfirm={() => void onTerminateSessions(otherSessionIds, { signOut: false })}
                                trigger={
                                    <Button type="button" variant="outline" disabled={actionBusy}>
                                        {{ de: 'Überall sonst abmelden', en: 'Sign out everywhere else' }[locale]}
                                    </Button>
                                }
                            />
                        ) : null}
                        <AccountSignOutDialog
                            disabled={actionBusy}
                            title={{ de: 'Auf diesem Gerät abmelden?', en: 'Sign out on this device?' }[locale]}
                            description={
                                {
                                    de: 'Du wirst auf diesem Gerät abgemeldet und musst dich erneut anmelden, um auf dein Konto zuzugreifen.',
                                    en: 'You will be signed out on this device and will need to sign in again to access your account.',
                                }[locale]
                            }
                            confirmLabel={{ de: 'Abmelden', en: 'Sign out' }[locale]}
                            onConfirm={() => void onTerminateSessions([currentSessionId], { signOut: true })}
                            trigger={
                                <Button type="button" variant="outline" disabled={actionBusy}>
                                    <LogOutIcon />
                                    {{ de: 'Abmelden', en: 'Sign out' }[locale]}
                                </Button>
                            }
                        />
                    </div>
                </div>
            </AccountCard>

            <AccountCard
                title={{ de: 'Benachrichtigungen', en: 'Notifications' }[locale]}
                description={
                    {
                        de: 'Lege fest, wobei wir dir schreiben. In der App bleibt alles sichtbar. Anmeldecodes, Zahlungen und Support gehen immer an deine E-Mail.',
                        en: 'Choose what we write to you about. Everything still shows in the app. Sign-in codes, payments, and support always go to your email.',
                    }[locale]
                }
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
                title={{ de: 'Konto löschen', en: 'Delete account' }[locale]}
                description={
                    {
                        de: 'Personenbezogene Daten werden entfernt. Du kannst dich danach nicht mehr anmelden.',
                        en: 'Personal profile data will be removed. You will not be able to sign in afterwards.',
                    }[locale]
                }
            >
                <div className="flex justify-end">
                    <Button type="button" variant="destructive" size="sm" disabled={actionBusy} onClick={openDeleteDialog}>
                        {{ de: 'Konto löschen', en: 'Delete account' }[locale]}
                    </Button>
                </div>
            </AccountCard>

            <nav className="flex flex-wrap gap-x-4 gap-y-2 px-1 text-sm text-muted-foreground">
                <Link to="/{-$locale}/privacy-policy" className="underline-offset-4 hover:text-foreground hover:underline">
                    {{ de: 'Datenschutzerklärung', en: 'Privacy policy' }[locale]}
                </Link>
                <Link to="/{-$locale}/terms-and-conditions" className="underline-offset-4 hover:text-foreground hover:underline">
                    {{ de: 'AGB', en: 'Terms and conditions' }[locale]}
                </Link>
                <Link to="/{-$locale}/imprint" className="underline-offset-4 hover:text-foreground hover:underline">
                    {{ de: 'Impressum', en: 'Imprint' }[locale]}
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
                                <DialogTitle>
                                    {{ de: 'Konto wirklich löschen?', en: 'Delete your account permanently?' }[locale]}
                                </DialogTitle>
                                <DialogDescription>
                                    {
                                        {
                                            de: 'Diese Aktion kann nicht rückgängig gemacht werden. Deine persönlichen Daten werden entfernt und alle Geräte abgemeldet. Buchungsverläufe bleiben für Köche und den Betrieb erhalten, sind aber nicht mehr mit deiner Identität verknüpft. Wir senden einen Code an deine E-Mail-Adresse.',
                                            en: 'This cannot be undone. Your personal data will be removed and all devices signed out. Booking history stays available for chefs and operations, but is no longer linked to your identity. We will send a code to your email address.',
                                        }[locale]
                                    }
                                </DialogDescription>
                            </DialogHeader>
                            {deleteError != null ? <p className="py-4 text-sm text-destructive">{deleteError}</p> : null}
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" disabled={actionBusy} onClick={() => setDeleteDialogOpen(false)}>
                                    {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                                </Button>
                                <Button type="submit" variant="destructive" disabled={actionBusy}>
                                    {{ de: actionBusy ? 'Sendet…' : 'Code senden', en: actionBusy ? 'Sending…' : 'Send code' }[locale]}
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
                                <DialogTitle>{{ de: 'Code eingeben', en: 'Enter code' }[locale]}</DialogTitle>
                                <DialogDescription>
                                    {
                                        {
                                            de: `Wir haben einen Code an ${currentEmailAddress} gesendet.`,
                                            en: `We sent a code to ${currentEmailAddress}.`,
                                        }[locale]
                                    }
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
                            {deleteError != null ? <p className="text-sm text-destructive">{deleteError}</p> : null}
                            <DialogFooter>
                                <Button type="button" variant="outline" disabled={actionBusy} onClick={() => setDeleteDialogOpen(false)}>
                                    {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                                </Button>
                                <Button type="submit" variant="destructive" disabled={actionBusy || deleteCode.length !== 6}>
                                    {{ de: 'Konto löschen', en: 'Delete account' }[locale]}
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
                                    ? { de: 'Telefonnummer ändern', en: 'Change phone number' }[locale]
                                    : { de: 'Telefonnummer hinzufügen', en: 'Add a phone number' }[locale]}
                            </DialogTitle>
                            <DialogDescription>
                                {
                                    {
                                        de: 'Mit Ländervorwahl, zum Beispiel +49…',
                                        en: 'Include the country code, for example +49…',
                                    }[locale]
                                }
                            </DialogDescription>
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
                                {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                            </Button>
                            <Button type="submit" disabled={actionBusy}>
                                {{ de: actionBusy ? 'Speichert…' : 'Speichern', en: actionBusy ? 'Saving…' : 'Save' }[locale]}
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
                    <AlertDialogCancel disabled={disabled}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
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
