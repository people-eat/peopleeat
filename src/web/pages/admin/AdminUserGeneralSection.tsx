import { useForm, useSelector } from '@tanstack/react-form';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { format } from 'date-fns';
import { de as dateFnsDe, enUS as dateFnsEn } from 'date-fns/locale';
import { CheckIcon, CopyIcon, LogInIcon, MailIcon, PhoneIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '../../components/base/avatar';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { DatePicker } from '../../components/base/date-picker';
import { Input } from '../../components/base/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/base/tooltip';
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

const GENERAL_FORM_ID = 'admin-user-general-form';

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

function adminUserStatusBadgeVariant(status: GqlCUserStatus): 'default' | 'destructive' {
    if (status === 'ANONYMIZED' || status === 'BANNED') return 'destructive';
    return 'default';
}

function preferredCommunicationLabel(value: GqlCUserPreferredCommunication | null | undefined, locale: Locale): string {
    if (value == null) return { de: 'Nicht angegeben', en: 'Not set' }[locale];
    return {
        SMS: { de: 'Nachricht', en: 'Message' },
        WHATS_APP: { de: 'WhatsApp', en: 'WhatsApp' },
        CALL: { de: 'Anruf', en: 'Call' },
        E_MAIL: { de: 'E-Mail', en: 'Email' },
    }[value][locale];
}

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

function CopyValueButton({ text }: { text: string }) {
    const locale = useLocale();
    const [copied, setCopied] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const idleLabel = { de: 'Kopieren', en: 'Copy' }[locale];
    const ariaLabel = copied ? { de: 'Kopiert', en: 'Copied' }[locale] : idleLabel;

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const onCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success({ de: 'In die Zwischenablage kopiert', en: 'Copied to clipboard' }[locale]);
        } catch {
            toast.error({ de: 'Kopieren in die Zwischenablage fehlgeschlagen', en: 'Could not copy to clipboard' }[locale]);
        }
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 1500);
    }, [text, locale]);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={ariaLabel}
                    onClick={() => void onCopy()}
                    className="opacity-70 hover:opacity-100"
                >
                    {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{ariaLabel}</TooltipContent>
        </Tooltip>
    );
}

function DetailActionLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-xs" asChild className="opacity-70 hover:opacity-100">
                    <a href={href} aria-label={label}>
                        {children}
                    </a>
                </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

function DetailField({
    label,
    value,
    mono,
    copyText,
    actions,
}: {
    label: string;
    value: ReactNode;
    mono?: boolean;
    copyText?: string;
    actions?: ReactNode;
}) {
    const hasActions = copyText != null || actions != null;
    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className="flex min-w-0 items-start gap-1">
                <div
                    className={
                        mono
                            ? 'min-w-0 flex-1 font-mono text-sm break-all text-foreground'
                            : 'min-w-0 flex-1 text-sm whitespace-pre-wrap text-foreground'
                    }
                >
                    {value}
                </div>
                {hasActions ? (
                    <div className="flex shrink-0 items-center gap-0.5">
                        {actions}
                        {copyText != null ? <CopyValueButton text={copyText} /> : null}
                    </div>
                ) : null}
            </dd>
        </div>
    );
}

export function AdminUserGeneralSection({
    user,
    onFooterChange,
}: {
    user: AdminUserRow;
    onFooterChange: (footer: ReactNode | undefined) => void;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const router = useRouter();
    const navigate = useNavigate();
    const [, updateUser] = useMutation(AdminUserUpdateDocument);
    const [, updateEmail] = useMutation(AdminUserEmailAddressUpdateDocument);
    const [, bindSession] = useMutation(AdminUserSessionUserBindDocument);
    const [, anonymizeUser] = useMutation(AdminUserAnonymizeDocument);
    const [, updateStatus] = useMutation(AdminUserStatusUpdateDocument);
    const [editing, setEditing] = useState(false);
    const [profilePictureBusy, setProfilePictureBusy] = useState(false);
    const [impersonateBusy, setImpersonateBusy] = useState(false);
    const [anonymizeBusy, setAnonymizeBusy] = useState(false);
    const [statusBusy, setStatusBusy] = useState(false);
    const alreadyAnonymized = user.status === 'ANONYMIZED';
    const isBanned = user.status === 'BANNED';
    const canImpersonate = user.status === 'ACTIVE';
    const canToggleBan = user.status === 'ACTIVE' || user.status === 'BANNED';
    const birthDateBounds = userBirthDatePickerBounds();
    const displayName = userDisplayName(user);
    const empty = { de: 'Nicht angegeben', en: 'Not set' }[locale];

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
            setEditing(false);
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
            setEditing(false);
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
            await router.invalidate();
        } finally {
            setStatusBusy(false);
        }
    }

    function onStartEdit() {
        form.reset(formFromUser(user));
        setEditing(true);
    }

    function onCancelEdit() {
        form.reset(formFromUser(user));
        setEditing(false);
    }

    const formBusy = isSubmitting || profilePictureBusy || alreadyAnonymized;
    const profilePictureUrl = user.profilePicture?.url ?? null;

    useEffect(() => {
        const impersonateControl = canImpersonate ? (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button type="button" variant="ghost" disabled={impersonateBusy || editing}>
                        <LogInIcon aria-hidden />
                        {{ de: 'Anmelden als', en: 'Sign in as' }[locale]}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {
                                {
                                    de: `Als ${displayName} anmelden?`,
                                    en: `Sign in as ${displayName}?`,
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
                        <AlertDialogCancel disabled={impersonateBusy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction disabled={impersonateBusy} onClick={() => void onImpersonate()}>
                            {{ de: 'Anmelden als', en: 'Sign in as' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        ) : (
            <Button type="button" variant="ghost" disabled>
                {{ de: 'Anmelden als', en: 'Sign in as' }[locale]}
            </Button>
        );

        const primaryActions = editing ? (
            <>
                <Button type="button" variant="outline" disabled={formBusy} onClick={onCancelEdit}>
                    {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                </Button>
                <Button type="submit" form={GENERAL_FORM_ID} disabled={formBusy || !isDirty}>
                    {isSubmitting ? { de: 'Speichern…', en: 'Saving…' }[locale] : { de: 'Speichern', en: 'Save' }[locale]}
                </Button>
            </>
        ) : (
            <Button type="button" disabled={alreadyAnonymized} onClick={onStartEdit}>
                {{ de: 'Bearbeiten', en: 'Edit' }[locale]}
            </Button>
        );

        onFooterChange(
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">{impersonateControl}</div>
                <div className="flex flex-wrap items-center gap-2">{primaryActions}</div>
            </div>,
        );

        return () => onFooterChange(undefined);
    }, [alreadyAnonymized, canImpersonate, displayName, editing, formBusy, impersonateBusy, isDirty, isSubmitting, locale, onFooterChange]);

    return (
        <div className="@container grid w-full min-w-0 gap-8">
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant={adminUserStatusBadgeVariant(user.status)}>{adminUserStatusLabel(user.status, locale)}</Badge>
                {user.types.map((type) => (
                    <Badge key={type} variant="outline">
                        {adminUserTypeLabel(type, locale)}
                    </Badge>
                ))}
            </div>

            <div className="flex flex-wrap items-start gap-4">
                {editing ? (
                    <ProfilePictureEditor
                        profilePictureUrl={profilePictureUrl}
                        displayName={displayName}
                        disabled={formBusy}
                        onLink={onProfilePictureLink}
                        onClear={onProfilePictureClear}
                        onBusyChange={setProfilePictureBusy}
                    />
                ) : (
                    <Avatar className="size-20 shrink-0">
                        {profilePictureUrl ? <AvatarImage src={profilePictureUrl} alt="" className="object-cover" /> : null}
                        <AvatarFallback className="text-lg">{initialsFromName(displayName)}</AvatarFallback>
                    </Avatar>
                )}
                <div className="grid min-w-0 gap-1 self-center">
                    <h2 className="font-serif text-2xl/tight text-foreground">{displayName}</h2>
                    <p className="text-sm text-muted-foreground">
                        {{ de: 'Registriert', en: 'Registered' }[locale]}{' '}
                        {formatDate(user.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                    </p>
                </div>
            </div>

            {editing ? (
                <form
                    id={GENERAL_FORM_ID}
                    className="grid gap-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void form.handleSubmit();
                    }}
                >
                    <div className="grid gap-4 @2xl:grid-cols-2">
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

                    <div className="grid gap-4 @2xl:grid-cols-2">
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
                    </div>

                    <div className="grid gap-4 @2xl:grid-cols-2">
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
                    </div>

                    <form.Field name="timeZone">
                        {(field) => (
                            <TimeZoneField
                                value={field.state.value}
                                onValueChange={(next) => field.handleChange(next)}
                                disabled={formBusy || alreadyAnonymized}
                            />
                        )}
                    </form.Field>
                </form>
            ) : (
                <dl className="grid gap-x-8 gap-y-5 @2xl:grid-cols-2 @6xl:grid-cols-3">
                    <DetailField
                        label={{ de: 'E-Mail', en: 'Email' }[locale]}
                        value={
                            <div className="grid gap-0.5">
                                <span className="break-all">{user.emailAddress?.trim() || empty}</span>
                                {user.previousEmailAddresses.length > 0 ? (
                                    <span className="text-xs text-muted-foreground">
                                        {{ de: 'Früher', en: 'Previous' }[locale]}: {user.previousEmailAddresses.join(', ')}
                                    </span>
                                ) : null}
                            </div>
                        }
                        copyText={user.emailAddress?.trim() || undefined}
                        actions={
                            user.emailAddress?.trim() ? (
                                <DetailActionLink
                                    href={`mailto:${user.emailAddress.trim()}`}
                                    label={{ de: 'E-Mail schreiben', en: 'Write email' }[locale]}
                                >
                                    <MailIcon aria-hidden />
                                </DetailActionLink>
                            ) : undefined
                        }
                    />
                    <DetailField
                        label={{ de: 'Telefon', en: 'Phone' }[locale]}
                        value={user.phoneNumber?.trim() || empty}
                        copyText={user.phoneNumber?.trim() || undefined}
                        actions={
                            user.phoneNumber?.trim() ? (
                                <DetailActionLink href={`tel:${user.phoneNumber.trim()}`} label={{ de: 'Anrufen', en: 'Call' }[locale]}>
                                    <PhoneIcon aria-hidden />
                                </DetailActionLink>
                            ) : undefined
                        }
                    />
                    <DetailField
                        label={{ de: 'Geburtsdatum', en: 'Date of birth' }[locale]}
                        value={user.birthDate ? formatDate(user.birthDate, { locale, dateStyle: 'long' }) : empty}
                    />
                    <DetailField
                        label={{ de: 'Bevorzugte Erreichbarkeit', en: 'Preferred contact' }[locale]}
                        value={preferredCommunicationLabel(user.preferredCommunication, locale)}
                    />
                    <DetailField label={{ de: 'Zeitzone', en: 'Time zone' }[locale]} value={user.timeZone} />
                    <DetailField label={{ de: 'Nutzer-ID', en: 'User ID' }[locale]} value={user.userId} mono copyText={user.userId} />
                </dl>
            )}

            {!editing ? (
                <div className="grid gap-4 @2xl:grid-cols-2">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
                        <div className="grid min-w-0 flex-1 gap-0.5">
                            <p className="text-sm font-medium text-foreground">
                                {isBanned
                                    ? { de: 'Nutzer entsperren', en: 'Unban user' }[locale]
                                    : { de: 'Nutzer sperren', en: 'Ban user' }[locale]}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {canToggleBan
                                    ? isBanned
                                        ? {
                                              de: 'Konto ist gesperrt. Öffentliche Koch-Sichtbarkeit und Marketplace-Aktionen sind eingeschränkt.',
                                              en: 'Account is banned. Public cook visibility and marketplace actions are restricted.',
                                          }[locale]
                                        : {
                                              de: 'Sperren blockiert Marketplace-Aktionen und öffentliche Koch-Profile. Der Nutzer kann sich weiterhin anmelden.',
                                              en: 'Banning blocks marketplace actions and public cook profiles. The user can still sign in.',
                                          }[locale]
                                    : alreadyAnonymized
                                      ? {
                                            de: 'Dieses Konto ist anonymisiert und kann nicht gesperrt oder entsperrt werden.',
                                            en: 'This account is anonymized and cannot be banned or unbanned.',
                                        }[locale]
                                      : {
                                            de: 'Ban und Unban sind nur für aktive oder gesperrte Konten verfügbar.',
                                            en: 'Ban and unban are only available for active or banned accounts.',
                                        }[locale]}
                            </p>
                        </div>
                        {canToggleBan ? (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button type="button" variant={isBanned ? 'default' : 'outline'} size="sm" disabled={statusBusy}>
                                        {isBanned ? { de: 'Entsperren', en: 'Unban' }[locale] : { de: 'Sperren', en: 'Ban' }[locale]}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            {isBanned
                                                ? { de: 'Nutzer wirklich entsperren?', en: 'Unban this user?' }[locale]
                                                : { de: 'Nutzer wirklich sperren?', en: 'Ban this user?' }[locale]}
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
                                            {isBanned ? { de: 'Entsperren', en: 'Unban' }[locale] : { de: 'Sperren', en: 'Ban' }[locale]}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        ) : (
                            <Button type="button" variant="outline" size="sm" disabled>
                                {isBanned ? { de: 'Entsperren', en: 'Unban' }[locale] : { de: 'Sperren', en: 'Ban' }[locale]}
                            </Button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 p-4">
                        <div className="grid min-w-0 flex-1 gap-0.5">
                            <p className="text-sm font-medium text-foreground">
                                {{ de: 'Nutzer anonymisieren', en: 'Anonymize user' }[locale]}
                            </p>
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
                                        <AlertDialogAction
                                            variant="destructive"
                                            disabled={anonymizeBusy}
                                            onClick={() => void onAnonymize()}
                                        >
                                            {{ de: 'Anonymisieren', en: 'Anonymize' }[locale]}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
