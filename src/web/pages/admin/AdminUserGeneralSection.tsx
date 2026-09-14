import { useForm, useSelector } from '@tanstack/react-form';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { format } from 'date-fns';
import { de as dateFnsDe, enUS as dateFnsEn } from 'date-fns/locale';
import { LogInIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { formatDate, userBirthDatePickerBounds, userDisplayName } from '../../../shared';
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
} from '../../components/base/alert-dialog';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { DatePicker } from '../../components/base/date-picker';
import { Input } from '../../components/base/input';
import { Separator } from '../../components/base/separator';
import { PreferredCommunicationField } from '../../components/PreferredCommunicationField';
import { ProfilePictureEditor } from '../../components/ProfilePictureEditor';
import { TimeZoneField } from '../../components/TimeZoneField';
import type { GqlCAdminUserPageQuery, GqlCUserPreferredCommunication, GqlCUserStatus } from '../../graphql/generated';
import {
    AdminUserAnonymizeDocument,
    AdminUserEmailAddressUpdateDocument,
    AdminUserSessionUserBindDocument,
    AdminUserStatusUpdateDocument,
    AdminUserUpdateDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { DEFAULT_LOCALE, localePath, LOCALES, setLocaleCookie } from '../../utils/locale';
import type { Locale } from '../../utils/locale';
import { adminUserTypeLabel } from './adminUsersColumns';

type AdminUserRow = NonNullable<NonNullable<NonNullable<GqlCAdminUserPageQuery['currentSession']['user']>['admin']>['user']>;

type GeneralFormValues = {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    birthDate: Date | undefined;
    preferredCommunication: GqlCUserPreferredCommunication | '';
    emailAddress: string;
    timeZone: string;
};

function formFromUser(user: AdminUserRow): GeneralFormValues {
    return {
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber ?? '',
        birthDate: user.birthDate ? new Date(`${user.birthDate}T00:00:00`) : undefined,
        preferredCommunication: user.preferredCommunication ?? '',
        emailAddress: user.emailAddress ?? '',
        timeZone: user.timeZone,
    };
}

function adminUserStatusLabel(status: GqlCUserStatus, locale: Locale): string {
    return {
        ACTIVE: { de: 'Aktiv', en: 'Active' },
        BANNED: { de: 'Gesperrt', en: 'Banned' },
        ANONYMIZED: { de: 'Anonymisiert', en: 'Anonymized' },
    }[status][locale];
}

function adminUserStatusBadgeVariant(status: GqlCUserStatus): 'default' | 'secondary' | 'destructive' {
    if (status === 'ANONYMIZED') return 'destructive';
    if (status === 'BANNED') return 'destructive';
    return 'secondary';
}

export function AdminUserGeneralSection({ user }: { user: AdminUserRow }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const router = useRouter();
    const navigate = useNavigate();
    const [, updateUser] = useMutation(AdminUserUpdateDocument);
    const [, updateEmail] = useMutation(AdminUserEmailAddressUpdateDocument);
    const [, bindSession] = useMutation(AdminUserSessionUserBindDocument);
    const [, anonymizeUser] = useMutation(AdminUserAnonymizeDocument);
    const [, updateStatus] = useMutation(AdminUserStatusUpdateDocument);
    const [profilePictureBusy, setProfilePictureBusy] = useState(false);
    const [impersonateBusy, setImpersonateBusy] = useState(false);
    const [anonymizeBusy, setAnonymizeBusy] = useState(false);
    const [statusBusy, setStatusBusy] = useState(false);
    const alreadyAnonymized = user.status === 'ANONYMIZED';
    const isBanned = user.status === 'BANNED';
    const canImpersonate = user.status === 'ACTIVE';
    const canToggleBan = user.status === 'ACTIVE' || user.status === 'BANNED';
    const birthDateBounds = userBirthDatePickerBounds();

    const form = useForm({
        defaultValues: formFromUser(user),
        onSubmit: async ({ value }) => {
            if (alreadyAnonymized) return;

            const profileResult = await updateUser({
                userId: user.userId,
                user: {
                    firstName: value.firstName.trim(),
                    lastName: value.lastName.trim(),
                    phoneNumber: value.phoneNumber.trim() || undefined,
                    birthDate: value.birthDate ? format(value.birthDate, 'yyyy-MM-dd') : undefined,
                    preferredCommunication: value.preferredCommunication || undefined,
                    timeZone: value.timeZone,
                },
            });
            if (profileResult.error || !profileResult.data?.admin.userUpdate.success) {
                toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
                return;
            }

            const nextEmail = value.emailAddress.trim();
            const currentEmail = user.emailAddress ?? '';
            if (nextEmail.length > 0 && nextEmail !== currentEmail) {
                const emailResult = await updateEmail({ userId: user.userId, emailAddress: nextEmail });
                if (emailResult.error || !emailResult.data?.admin.userEmailAddressUpdate.success) {
                    toast.error(
                        {
                            de: 'Profil gespeichert, E-Mail konnte nicht geändert werden.',
                            en: 'Profile saved, but the email could not be changed.',
                        }[locale],
                    );
                    await router.invalidate();
                    return;
                }
            }

            toast.success({ de: 'Gespeichert.', en: 'Saved.' }[locale]);
            await router.invalidate();
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const isDirty = useSelector(form.store, (state) => state.isDirty);

    useEffect(() => {
        if (!isDirty) {
            form.reset(formFromUser(user));
        }
    }, [form, isDirty, user]);

    async function onProfilePictureLink(fileUploadId: string) {
        const result = await updateUser({ userId: user.userId, user: { profilePictureFileUploadId: fileUploadId } });
        if (result.error || !result.data?.admin.userUpdate.success) {
            throw result.error ?? new Error('Could not save.');
        }
        await router.invalidate();
    }

    async function onProfilePictureClear() {
        const result = await updateUser({ userId: user.userId, user: { profilePictureFileUploadId: null } });
        if (result.error || !result.data?.admin.userUpdate.success) {
            throw result.error ?? new Error('Could not save.');
        }
        await router.invalidate();
    }

    async function onImpersonate() {
        setImpersonateBusy(true);
        try {
            const result = await bindSession({ userId: user.userId });
            if (result.error || !result.data?.admin.sessionUserBind.success) {
                toast.error({ de: 'Anmeldung als Nutzer fehlgeschlagen.', en: 'Could not sign in as this user.' }[locale]);
                return;
            }
            toast.success({ de: 'Als Nutzer angemeldet.', en: 'Signed in as user.' }[locale]);
            // Land on the target user's profile locale (cookie + path) so we do
            // not keep the admin `/en/…` route and then hit LocaleMismatchGate
            // (which previously could build `/en/en/…` when rewriting).
            const targetLocale: Locale = LOCALES.includes(user.locale as Locale) ? (user.locale as Locale) : DEFAULT_LOCALE;
            setLocaleCookie(targetLocale);
            await navigate({ href: localePath(targetLocale, '/profile') });
        } finally {
            setImpersonateBusy(false);
        }
    }

    async function onAnonymize() {
        setAnonymizeBusy(true);
        try {
            const result = await anonymizeUser({ userId: user.userId });
            if (result.error || !result.data?.admin.userAnonymize.success) {
                toast.error({ de: 'Anonymisierung fehlgeschlagen.', en: 'Could not anonymize the user.' }[locale]);
                return;
            }
            toast.success({ de: 'Nutzer anonymisiert.', en: 'User anonymized.' }[locale]);
            await router.invalidate();
        } finally {
            setAnonymizeBusy(false);
        }
    }

    async function onStatusUpdate(nextStatus: 'ACTIVE' | 'BANNED') {
        setStatusBusy(true);
        try {
            const result = await updateStatus({ userId: user.userId, status: nextStatus });
            if (result.error || !result.data?.admin.userStatusUpdate.success) {
                toast.error(
                    nextStatus === 'BANNED'
                        ? { de: 'Sperren fehlgeschlagen.', en: 'Could not ban the user.' }[locale]
                        : { de: 'Entsperren fehlgeschlagen.', en: 'Could not unban the user.' }[locale],
                );
                return;
            }
            toast.success(
                nextStatus === 'BANNED'
                    ? { de: 'Nutzer gesperrt.', en: 'User banned.' }[locale]
                    : { de: 'Nutzer entsperrt.', en: 'User unbanned.' }[locale],
            );
        } finally {
            setStatusBusy(false);
        }
    }

    const formBusy = isSubmitting || profilePictureBusy || alreadyAnonymized;

    return (
        <div className="grid max-w-2xl gap-8">
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
                <div className="grid gap-1">
                    <p className="font-medium">{{ de: 'Als Nutzer anmelden', en: 'Sign in as user' }[locale]}</p>
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Deine Admin-Sitzung wird an dieses Konto gebunden. Du verlässt die Administration.',
                                en: 'Your admin session will bind to this account. You leave the admin workspace.',
                            }[locale]
                        }
                    </p>
                </div>
                {canImpersonate ? (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button type="button" variant="outline" disabled={impersonateBusy}>
                                <LogInIcon aria-hidden />
                                {{ de: 'Anmelden als', en: 'Sign in as' }[locale]}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    {
                                        {
                                            de: `Als ${userDisplayName(user)} anmelden?`,
                                            en: `Sign in as ${userDisplayName(user)}?`,
                                        }[locale]
                                    }
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    {
                                        {
                                            de: 'Du handelst danach als dieser Nutzer. Um zurückzukehren, melde dich erneut als Admin an.',
                                            en: 'You will act as this user afterward. To return, sign in again as an admin.',
                                        }[locale]
                                    }
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={impersonateBusy}>
                                    {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                                </AlertDialogCancel>
                                <AlertDialogAction disabled={impersonateBusy} onClick={() => void onImpersonate()}>
                                    {{ de: 'Anmelden als', en: 'Sign in as' }[locale]}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                ) : (
                    <Button type="button" variant="outline" disabled>
                        {{ de: 'Nicht verfügbar', en: 'Unavailable' }[locale]}
                    </Button>
                )}
            </section>

            <section className="grid gap-3">
                <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                    {{ de: 'Profilbild', en: 'Profile picture' }[locale]}
                </h2>
                <ProfilePictureEditor
                    profilePictureUrl={user.profilePicture?.url ?? null}
                    displayName={userDisplayName(user)}
                    disabled={formBusy}
                    onLink={onProfilePictureLink}
                    onClear={onProfilePictureClear}
                    onBusyChange={setProfilePictureBusy}
                />
            </section>

            <form
                className="grid gap-6"
                onSubmit={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void form.handleSubmit();
                }}
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <form.Field name="firstName">
                        {(field) => (
                            <div className="grid gap-2">
                                <label htmlFor="admin-user-first-name" className="text-sm font-medium">
                                    {{ de: 'Vorname', en: 'First name' }[locale]}
                                </label>
                                <Input
                                    id="admin-user-first-name"
                                    value={field.state.value}
                                    disabled={formBusy}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                />
                            </div>
                        )}
                    </form.Field>
                    <form.Field name="lastName">
                        {(field) => (
                            <div className="grid gap-2">
                                <label htmlFor="admin-user-last-name" className="text-sm font-medium">
                                    {{ de: 'Nachname', en: 'Last name' }[locale]}
                                </label>
                                <Input
                                    id="admin-user-last-name"
                                    value={field.state.value}
                                    disabled={formBusy}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                />
                            </div>
                        )}
                    </form.Field>
                </div>

                <form.Field name="emailAddress">
                    {(field) => (
                        <div className="grid gap-2">
                            <label htmlFor="admin-user-email" className="text-sm font-medium">
                                {{ de: 'E-Mail', en: 'Email' }[locale]}
                            </label>
                            <Input
                                id="admin-user-email"
                                type="email"
                                value={field.state.value}
                                disabled={formBusy}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(event.target.value)}
                            />
                            {user.previousEmailAddresses.length > 0 ? (
                                <p className="text-xs text-muted-foreground">
                                    {{ de: 'Früher', en: 'Previous' }[locale]}: {user.previousEmailAddresses.join(', ')}
                                </p>
                            ) : null}
                        </div>
                    )}
                </form.Field>

                <form.Field name="phoneNumber">
                    {(field) => (
                        <div className="grid gap-2">
                            <label htmlFor="admin-user-phone" className="text-sm font-medium">
                                {{ de: 'Telefon', en: 'Phone' }[locale]}
                            </label>
                            <Input
                                id="admin-user-phone"
                                value={field.state.value}
                                disabled={formBusy}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(event.target.value)}
                            />
                        </div>
                    )}
                </form.Field>

                <form.Field name="birthDate">
                    {(field) => (
                        <div className="grid gap-2">
                            <span className="text-sm font-medium">{{ de: 'Geburtsdatum', en: 'Date of birth' }[locale]}</span>
                            <DatePicker
                                value={field.state.value}
                                onValueChange={(next) => field.handleChange(next)}
                                placeholder={{ de: 'Geburtsdatum', en: 'Date of birth' }[locale]}
                                className="w-full"
                                disabled={formBusy ? true : { after: birthDateBounds.disabledAfter }}
                                locale={locale === 'de' ? dateFnsDe : dateFnsEn}
                                captionLayout="dropdown"
                                defaultMonth={birthDateBounds.defaultMonth}
                                startMonth={birthDateBounds.startMonth}
                                endMonth={birthDateBounds.endMonth}
                                aria-label={{ de: 'Geburtsdatum', en: 'Date of birth' }[locale]}
                            />
                        </div>
                    )}
                </form.Field>

                <form.Field name="preferredCommunication">
                    {(field) => (
                        <PreferredCommunicationField
                            value={field.state.value}
                            onValueChange={(next) => field.handleChange(next)}
                            disabled={formBusy}
                            showTitle
                        />
                    )}
                </form.Field>

                <form.Field name="timeZone">
                    {(field) => (
                        <TimeZoneField
                            value={field.state.value}
                            onValueChange={(next) => field.handleChange(next)}
                            disabled={formBusy || alreadyAnonymized}
                        />
                    )}
                </form.Field>

                <dl className="grid gap-4">
                    <div className="grid gap-1">
                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {{ de: 'Status', en: 'Status' }[locale]}
                        </dt>
                        <dd className="flex flex-wrap items-center gap-2">
                            <Badge variant={adminUserStatusBadgeVariant(user.status)}>{adminUserStatusLabel(user.status, locale)}</Badge>
                            {canToggleBan ? (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button type="button" variant="outline" size="sm" disabled={statusBusy}>
                                            {isBanned ? { de: 'Entsperren', en: 'Unban' }[locale] : { de: 'Sperren', en: 'Ban' }[locale]}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>
                                                {isBanned
                                                    ? {
                                                          de: 'Nutzer wirklich entsperren?',
                                                          en: 'Unban this user?',
                                                      }[locale]
                                                    : {
                                                          de: 'Nutzer wirklich sperren?',
                                                          en: 'Ban this user?',
                                                      }[locale]}
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {isBanned
                                                    ? {
                                                          de: 'Das Konto wird wieder aktiv. Öffentliche Koch-Sichtbarkeit hängt weiter von Freigabe und Profil-Einstellungen ab. Abgelehnte Angebote werden nicht wiederhergestellt.',
                                                          en: 'The account becomes active again. Public cook visibility still depends on approval and profile settings. Declined offers are not restored.',
                                                      }[locale]
                                                    : {
                                                          de: 'Der Nutzer kann sich weiterhin anmelden, sieht aber eine Einschränkung. Öffentliche Koch-Profile verschwinden, offene Angebote werden automatisch abgelehnt, und Marketplace-Aktionen sind gesperrt.',
                                                          en: 'The user can still sign in, but will see a restriction banner. Public cook profiles disappear, open offers are auto-declined, and marketplace actions are blocked.',
                                                      }[locale]}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel disabled={statusBusy}>
                                                {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                                variant={isBanned ? 'default' : 'destructive'}
                                                disabled={statusBusy}
                                                onClick={() => void onStatusUpdate(isBanned ? 'ACTIVE' : 'BANNED')}
                                            >
                                                {isBanned
                                                    ? { de: 'Entsperren', en: 'Unban' }[locale]
                                                    : { de: 'Sperren', en: 'Ban' }[locale]}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            ) : null}
                        </dd>
                    </div>
                    <Separator />
                    <div className="grid gap-1">
                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {{ de: 'Typ', en: 'Type' }[locale]}
                        </dt>
                        <dd className="flex flex-wrap gap-1">
                            {user.types.map((type) => (
                                <Badge key={type} variant="secondary">
                                    {adminUserTypeLabel(type, locale)}
                                </Badge>
                            ))}
                        </dd>
                    </div>
                    <Separator />
                    <div className="grid gap-1">
                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {{ de: 'Registriert', en: 'Registered' }[locale]}
                        </dt>
                        <dd className="text-sm">{formatDate(user.createdAt, { locale, timeZone, dateStyle: 'long' })}</dd>
                    </div>
                    <Separator />
                    <div className="grid gap-1">
                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {{ de: 'Nutzer-ID', en: 'User ID' }[locale]}
                        </dt>
                        <dd className="font-mono text-sm break-all">{user.userId}</dd>
                    </div>
                </dl>

                <div>
                    <Button type="submit" disabled={formBusy || !isDirty}>
                        {isSubmitting ? { de: 'Speichern…', en: 'Saving…' }[locale] : { de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </div>
            </form>

            <section className="grid gap-3">
                <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                    {{ de: 'Gefahrenzone', en: 'Danger zone' }[locale]}
                </h2>
                <div className="flex items-center justify-between gap-4 rounded-xl border border-destructive/30 px-4 py-3">
                    <div className="grid gap-0.5">
                        <p className="text-sm text-foreground">{{ de: 'Nutzer anonymisieren', en: 'Anonymize user' }[locale]}</p>
                        <p className="text-xs text-muted-foreground">
                            {alreadyAnonymized
                                ? {
                                      de: 'Dieses Konto ist bereits anonymisiert.',
                                      en: 'This account is already anonymized.',
                                  }[locale]
                                : {
                                      de: 'Personenbezogene Daten entfernen, E-Mail nullen, Sitzungen beenden. Buchungsverläufe bleiben erhalten.',
                                      en: 'Remove personal data, null the email, end sessions. Booking history is kept.',
                                  }[locale]}
                        </p>
                    </div>
                    {alreadyAnonymized ? (
                        <Button type="button" variant="destructive" size="sm" disabled>
                            {{ de: 'Anonymisiert', en: 'Anonymized' }[locale]}
                        </Button>
                    ) : (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="destructive" size="sm" disabled={anonymizeBusy}>
                                    {{ de: 'Anonymisieren', en: 'Anonymize' }[locale]}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        {{ de: 'Nutzer wirklich anonymisieren?', en: 'Anonymize this user permanently?' }[locale]}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {
                                            {
                                                de: 'Diese Aktion kann nicht rückgängig gemacht werden. Persönliche Daten werden entfernt, alle Sitzungen beendet und der Nutzer kann sich nicht mehr anmelden. Relationale Historie (Buchungen, Angebote) bleibt für den Betrieb erhalten.',
                                                en: 'This cannot be undone. Personal data will be removed, all sessions ended, and the user will no longer be able to sign in. Relational history (bookings, offers) stays available for operations.',
                                            }[locale]
                                        }
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={anonymizeBusy}>
                                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                                    </AlertDialogCancel>
                                    <AlertDialogAction variant="destructive" disabled={anonymizeBusy} onClick={() => void onAnonymize()}>
                                        {{ de: 'Anonymisieren', en: 'Anonymize' }[locale]}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </section>
        </div>
    );
}
