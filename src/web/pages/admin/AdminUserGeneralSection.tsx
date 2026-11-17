import { useForm, useSelector } from '@tanstack/react-form';
import { useRouter } from '@tanstack/react-router';
import { format } from 'date-fns';
import { de as dateFnsDe, enUS as dateFnsEn } from 'date-fns/locale';
import { CheckIcon, CopyIcon, LogInIcon, MailIcon, PhoneIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
import { formatDate, formatDateTime, userBirthDatePickerBounds, userDisplayName } from '../../../shared';
import { AccountNotificationSettings } from '../../components/AccountNotificationSettings';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { Separator } from '../../components/base/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/base/tooltip';
import { PreferredCommunicationField } from '../../components/PreferredCommunicationField';
import { ProfilePictureEditor } from '../../components/ProfilePictureEditor';
import { TimeZoneField } from '../../components/TimeZoneField';
import type {
    GqlCAdminUserAnonymizeMode,
    GqlCAdminUserPageQuery,
    GqlCLocale,
    GqlCUserPreferredCommunication,
    GqlCUserStatus,
} from '../../graphql/generated';
import {
    AdminUserAccountDeletionCancelDocument,
    AdminUserAnonymizeDocument,
    AdminUserEmailAddressUpdateDocument,
    AdminUserSessionUserBindDocument,
    AdminUserStatusUpdateDocument,
    AdminUserUpdateDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';
import { DEFAULT_LOCALE, isLocale, localePath, setLocaleCookie } from '../../utils/locale';
import { sessionSwitchUrl } from '../../utils/sessionSwitchUrl';
import { adminUserTypeLabel } from './adminUsersColumns';
import { AdminUserSignInSection } from './AdminUserSignInSection';

type AdminUserRow = NonNullable<NonNullable<NonNullable<GqlCAdminUserPageQuery['currentSession']['user']>['admin']>['user']>;

type GeneralFormValues = {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    birthDate: Date | undefined;
    preferredCommunication: GqlCUserPreferredCommunication | '';
    emailAddress: string;
    locale: GqlCLocale;
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
        locale: user.locale,
        timeZone: user.timeZone,
    };
}

function adminUserStatusLabel(status: GqlCUserStatus, locale: Locale): string {
    const labels = {
        ACTIVE: t(locale, 'admin', 'users.accountStatus.ACTIVE'),
        BANNED: t(locale, 'admin', 'users.accountStatus.BANNED'),
        ANONYMIZED: t(locale, 'admin', 'users.accountStatus.ANONYMIZED'),
    } satisfies Record<GqlCUserStatus, string>;
    return labels[status];
}

function adminUserStatusBadgeVariant(status: GqlCUserStatus): 'default' | 'destructive' {
    if (status === 'ANONYMIZED' || status === 'BANNED') return 'destructive';
    return 'default';
}

function localeLabel(value: string, uiLocale: Locale): string {
    if (!isLocale(value)) return value;
    const labels = {
        de: t(uiLocale, 'common', 'language.de'),
        en: t(uiLocale, 'common', 'language.en'),
        fr: t(uiLocale, 'common', 'language.fr'),
        it: t(uiLocale, 'common', 'language.it'),
        ru: t(uiLocale, 'common', 'language.ru'),
        nl: t(uiLocale, 'common', 'language.nl'),
    } satisfies Record<Locale, string>;
    return labels[value];
}

function preferredCommunicationLabel(value: GqlCUserPreferredCommunication | null | undefined, locale: Locale): string {
    if (value == null) return t(locale, 'admin', 'copy.notSet');
    const labels = {
        SMS: t(locale, 'admin', 'copy.message'),
        WHATS_APP: t(locale, 'admin', 'copy.whatsapp'),
        CALL: t(locale, 'admin', 'copy.call2'),
        E_MAIL: t(locale, 'admin', 'copy.email'),
    } satisfies Record<GqlCUserPreferredCommunication, string>;
    return labels[value];
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
    const idleLabel = t(locale, 'admin', 'copy.copy');
    const ariaLabel = copied ? t(locale, 'admin', 'copy.copied') : idleLabel;

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const onCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(t(locale, 'admin', 'copy.copiedToClipboard'));
        } catch {
            toast.error(t(locale, 'admin', 'copy.couldNotCopyToClipboard'));
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
    const [, updateUser] = useMutation(AdminUserUpdateDocument);
    const [, updateEmail] = useMutation(AdminUserEmailAddressUpdateDocument);
    const [, bindSession] = useMutation(AdminUserSessionUserBindDocument);
    const [, anonymizeUser] = useMutation(AdminUserAnonymizeDocument);
    const [, cancelAccountDeletion] = useMutation(AdminUserAccountDeletionCancelDocument);
    const [, updateStatus] = useMutation(AdminUserStatusUpdateDocument);
    const [editing, setEditing] = useState(false);
    const [profilePictureBusy, setProfilePictureBusy] = useState(false);
    const [impersonateBusy, setImpersonateBusy] = useState(false);
    const [anonymizeBusy, setAnonymizeBusy] = useState(false);
    const [statusBusy, setStatusBusy] = useState(false);
    const [anonymizeMode, setAnonymizeMode] = useState<GqlCAdminUserAnonymizeMode>('IMMEDIATE');
    const alreadyAnonymized = user.status === 'ANONYMIZED';
    const isBanned = user.status === 'BANNED';
    const canImpersonate = user.status === 'ACTIVE';
    const canToggleBan = user.status === 'ACTIVE' || user.status === 'BANNED';
    const deletionScheduledFor = user.accountDeletionScheduledFor;
    const birthDateBounds = userBirthDatePickerBounds();
    const displayName = userDisplayName(user, t(locale, 'common', 'deletedAccount'));
    const empty = t(locale, 'admin', 'copy.notSet');

    function mutationErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error ?? '');
    }

    function isCoolOffError(error: unknown): boolean {
        return /dual-accepted event cool-off/i.test(mutationErrorMessage(error));
    }

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
                    locale: value.locale,
                    timeZone: value.timeZone,
                },
            });
            if (profileResult.error || !profileResult.data?.admin.userUpdate.success) {
                toast.error(t(locale, 'admin', 'copy.couldNotSave'));
                return;
            }

            const nextEmail = value.emailAddress.trim();
            const currentEmail = user.emailAddress ?? '';
            if (nextEmail.length > 0 && nextEmail !== currentEmail) {
                const emailResult = await updateEmail({ userId: user.userId, emailAddress: nextEmail });
                if (emailResult.error || !emailResult.data?.admin.userEmailAddressUpdate.success) {
                    toast.error(t(locale, 'admin', 'copy.profileSavedButTheEmailCouldNotBeChanged'));
                    await router.invalidate();
                    return;
                }
            }

            toast.success(t(locale, 'admin', 'copy.saved'));
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
            const toSessionId = result.data?.admin.sessionUserBind.referenceId;
            if (result.error || !result.data?.admin.sessionUserBind.success || !toSessionId) {
                toast.error(t(locale, 'admin', 'copy.couldNotSignInAsThisUser'));
                setImpersonateBusy(false);
                return;
            }
            // Cookie swap + redirect in one response (mutation Set-Cookie then
            // location.assign races — browser can navigate with the old cookie).
            // Land on the target user's profile locale so LocaleMismatchGate
            // does not open from a leftover admin `/en/…` URL.
            const targetLocale: Locale = isLocale(user.locale) ? user.locale : DEFAULT_LOCALE;
            setLocaleCookie(targetLocale);
            window.location.assign(sessionSwitchUrl(toSessionId, localePath(targetLocale, '/profile')));
        } catch {
            setImpersonateBusy(false);
        }
    }

    async function onAnonymize() {
        setAnonymizeBusy(true);
        try {
            const result = await anonymizeUser({ userId: user.userId, mode: anonymizeMode });
            if (result.error || !result.data?.admin.userAnonymize.success) {
                toast.error(
                    isCoolOffError(result.error)
                        ? t(locale, 'admin', 'copy.dualAcceptedEventCoolOff')
                        : t(locale, 'admin', 'copy.couldNotAnonymizeTheUser'),
                );
                return;
            }
            toast.success(
                anonymizeMode === 'SCHEDULE'
                    ? t(locale, 'admin', 'copy.userAnonymizeScheduled')
                    : t(locale, 'admin', 'copy.userAnonymized'),
            );
            setEditing(false);
            await router.invalidate();
        } finally {
            setAnonymizeBusy(false);
        }
    }

    async function onCancelScheduledDeletion() {
        setAnonymizeBusy(true);
        try {
            const result = await cancelAccountDeletion({ userId: user.userId });
            if (result.error || !result.data?.admin.userAccountDeletionCancel.success) {
                toast.error(t(locale, 'admin', 'copy.couldNotCancelScheduledDeletion'));
                return;
            }
            toast.success(t(locale, 'admin', 'copy.scheduledDeletionCanceled'));
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
                    nextStatus === 'BANNED' && isCoolOffError(result.error)
                        ? t(locale, 'admin', 'copy.dualAcceptedEventCoolOff')
                        : nextStatus === 'BANNED'
                          ? t(locale, 'admin', 'copy.couldNotBanTheUser')
                          : t(locale, 'admin', 'copy.couldNotUnbanTheUser'),
                );
                return;
            }
            toast.success(nextStatus === 'BANNED' ? t(locale, 'admin', 'copy.userBanned') : t(locale, 'admin', 'copy.userUnbanned'));
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

    function onAddPhone() {
        if (alreadyAnonymized) return;
        if (!editing) onStartEdit();
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                document.getElementById('admin-user-phone')?.focus();
            });
        });
    }

    const formBusy = isSubmitting || profilePictureBusy || alreadyAnonymized;
    const profilePictureUrl = user.profilePicture?.url ?? null;

    useEffect(() => {
        const impersonateControl = canImpersonate ? (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button type="button" variant="ghost" disabled={impersonateBusy || editing}>
                        <LogInIcon aria-hidden />
                        {t(locale, 'admin', 'copy.signInAs')}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t(locale, 'admin', 'copy.signInAsNamed', { name: displayName })}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t(locale, 'admin', 'copy.youWillActAsThisUserAfterwardToReturnSignInAgainAsAnAdmin')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={impersonateBusy}>{t(locale, 'admin', 'copy.cancel')}</AlertDialogCancel>
                        <AlertDialogAction disabled={impersonateBusy} onClick={() => void onImpersonate()}>
                            {t(locale, 'admin', 'copy.signInAs')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        ) : (
            <Button type="button" variant="ghost" disabled>
                {t(locale, 'admin', 'copy.signInAs')}
            </Button>
        );

        const primaryActions = editing ? (
            <>
                <Button type="button" variant="outline" disabled={formBusy} onClick={onCancelEdit}>
                    {t(locale, 'admin', 'copy.cancel')}
                </Button>
                <Button type="submit" form={GENERAL_FORM_ID} disabled={formBusy || !isDirty}>
                    {isSubmitting ? t(locale, 'admin', 'copy.saving2') : t(locale, 'admin', 'copy.save')}
                </Button>
            </>
        ) : (
            <Button type="button" disabled={alreadyAnonymized} onClick={onStartEdit}>
                {t(locale, 'admin', 'copy.edit')}
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
                        {t(locale, 'admin', 'copy.registered')} {formatDate(user.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                    </p>
                </div>
            </div>

            {editing ? (
                <form
                    id={GENERAL_FORM_ID}
                    className="grid max-w-3xl gap-6"
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
                                        {t(locale, 'admin', 'copy.firstName')}
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
                                        {t(locale, 'admin', 'copy.lastName')}
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
                                        {t(locale, 'admin', 'copy.email')}
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
                                            {t(locale, 'admin', 'copy.previous')}: {user.previousEmailAddresses.join(', ')}
                                        </p>
                                    ) : null}
                                </div>
                            )}
                        </form.Field>

                        <form.Field name="phoneNumber">
                            {(field) => (
                                <div className="grid gap-2">
                                    <label htmlFor="admin-user-phone" className="text-sm font-medium">
                                        {t(locale, 'admin', 'copy.phone')}
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
                                    <span className="text-sm font-medium">{t(locale, 'admin', 'copy.dateOfBirth')}</span>
                                    <DatePicker
                                        value={field.state.value}
                                        onValueChange={(next) => field.handleChange(next)}
                                        placeholder={t(locale, 'admin', 'copy.dateOfBirth')}
                                        className="w-full"
                                        disabled={formBusy ? true : { after: birthDateBounds.disabledAfter }}
                                        locale={locale === 'de' ? dateFnsDe : dateFnsEn}
                                        captionLayout="dropdown"
                                        defaultMonth={birthDateBounds.defaultMonth}
                                        startMonth={birthDateBounds.startMonth}
                                        endMonth={birthDateBounds.endMonth}
                                        aria-label={t(locale, 'admin', 'copy.dateOfBirth')}
                                    />
                                </div>
                            )}
                        </form.Field>

                        <form.Field name="locale">
                            {(field) => (
                                <div className="grid gap-2">
                                    <label htmlFor="admin-user-locale" className="text-sm font-medium">
                                        {t(locale, 'admin', 'copy.language')}
                                    </label>
                                    <Select
                                        value={field.state.value}
                                        onValueChange={(next) => {
                                            if (next === 'de' || next === 'en') field.handleChange(next);
                                        }}
                                        disabled={formBusy}
                                    >
                                        <SelectTrigger id="admin-user-locale" className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="de">Deutsch</SelectItem>
                                            <SelectItem value="en">English</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">{t(locale, 'admin', 'copy.localeAffectsInterface')}</p>
                                </div>
                            )}
                        </form.Field>
                    </div>

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
                </form>
            ) : (
                <dl className="grid gap-x-8 gap-y-5 @2xl:grid-cols-2 @6xl:grid-cols-3">
                    <DetailField
                        label={t(locale, 'admin', 'copy.email')}
                        value={
                            <div className="grid gap-0.5">
                                <span className="break-all">{user.emailAddress?.trim() || empty}</span>
                                {user.previousEmailAddresses.length > 0 ? (
                                    <span className="text-xs text-muted-foreground">
                                        {t(locale, 'admin', 'copy.previous')}: {user.previousEmailAddresses.join(', ')}
                                    </span>
                                ) : null}
                            </div>
                        }
                        copyText={user.emailAddress?.trim() || undefined}
                        actions={
                            user.emailAddress?.trim() ? (
                                <DetailActionLink href={`mailto:${user.emailAddress.trim()}`} label={t(locale, 'admin', 'copy.writeEmail')}>
                                    <MailIcon aria-hidden />
                                </DetailActionLink>
                            ) : undefined
                        }
                    />
                    <DetailField
                        label={t(locale, 'admin', 'copy.phone')}
                        value={user.phoneNumber?.trim() || empty}
                        copyText={user.phoneNumber?.trim() || undefined}
                        actions={
                            user.phoneNumber?.trim() ? (
                                <DetailActionLink href={`tel:${user.phoneNumber.trim()}`} label={t(locale, 'admin', 'copy.call')}>
                                    <PhoneIcon aria-hidden />
                                </DetailActionLink>
                            ) : undefined
                        }
                    />
                    <DetailField
                        label={t(locale, 'admin', 'copy.dateOfBirth')}
                        value={user.birthDate ? formatDate(user.birthDate, { locale, dateStyle: 'long' }) : empty}
                    />
                    <DetailField
                        label={t(locale, 'admin', 'copy.preferredContact')}
                        value={preferredCommunicationLabel(user.preferredCommunication, locale)}
                    />
                    <DetailField label={t(locale, 'admin', 'copy.language')} value={localeLabel(user.locale, locale)} />
                    <DetailField label={t(locale, 'admin', 'copy.timeZone')} value={user.timeZone} />
                    <DetailField label={t(locale, 'admin', 'copy.userId')} value={user.userId} mono copyText={user.userId} />
                </dl>
            )}

            <Separator />

            <section className="grid max-w-3xl gap-4">
                <div className="grid gap-1">
                    <h3 className="text-sm font-medium text-foreground">{t(locale, 'admin', 'copy.notifications')}</h3>
                    <p className="text-sm text-muted-foreground">
                        {alreadyAnonymized
                            ? t(locale, 'admin', 'copy.thisAccountIsAnonymizedNoMessagesAreSent')
                            : t(locale, 'admin', 'copy.whatWeWriteToThisPersonAboutEverythingStillShowsInTheAppSign')}
                    </p>
                </div>
                {alreadyAnonymized ? null : (
                    <AccountNotificationSettings
                        value={user.notificationSettings}
                        hasPhoneNumber={Boolean(user.phoneNumber?.trim())}
                        isCook={user.cook != null}
                        disabled={formBusy}
                        voice="operator"
                        onAddPhone={onAddPhone}
                        onSave={async (notificationSettings) => {
                            const result = await updateUser({ userId: user.userId, user: { notificationSettings } });
                            if (result.error || !result.data?.admin.userUpdate.success) {
                                throw result.error ?? new Error('Could not save.');
                            }
                            await router.invalidate();
                        }}
                    />
                )}
            </section>

            <Separator />

            <AdminUserSignInSection
                userId={user.userId}
                passkeys={user.passkeys}
                totp={user.timeBasedOneTimePassword}
                oauthIdentities={user.oauthIdentities}
                disabled={alreadyAnonymized}
            />

            {!editing ? (
                <div className="grid gap-4 @2xl:grid-cols-2">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
                        <div className="grid min-w-0 flex-1 gap-0.5">
                            <p className="text-sm font-medium text-foreground">
                                {isBanned ? t(locale, 'admin', 'copy.unbanUser') : t(locale, 'admin', 'copy.banUser')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {canToggleBan
                                    ? isBanned
                                        ? t(locale, 'admin', 'copy.accountIsBannedPublicCookVisibilityAndMarketplaceActionsAreR')
                                        : t(locale, 'admin', 'copy.banningBlocksMarketplaceActionsAndPublicCookProfilesTheUserC')
                                    : alreadyAnonymized
                                      ? t(locale, 'admin', 'copy.thisAccountIsAnonymizedAndCannotBeBannedOrUnbanned')
                                      : t(locale, 'admin', 'copy.banAndUnbanAreOnlyAvailableForActiveOrBannedAccounts')}
                            </p>
                        </div>
                        {canToggleBan ? (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button type="button" variant={isBanned ? 'default' : 'outline'} size="sm" disabled={statusBusy}>
                                        {isBanned ? t(locale, 'admin', 'copy.unban') : t(locale, 'admin', 'copy.ban')}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            {isBanned ? t(locale, 'admin', 'copy.unbanThisUser') : t(locale, 'admin', 'copy.banThisUser')}
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {isBanned
                                                ? t(locale, 'admin', 'copy.theAccountBecomesActiveAgainPublicCookVisibilityStillDepends')
                                                : t(locale, 'admin', 'copy.theUserCanStillSignInButWillSeeARestrictionBannerPublicCookP')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel disabled={statusBusy}>{t(locale, 'admin', 'copy.cancel')}</AlertDialogCancel>
                                        <AlertDialogAction
                                            variant={isBanned ? 'default' : 'destructive'}
                                            disabled={statusBusy}
                                            onClick={() => void onStatusUpdate(isBanned ? 'ACTIVE' : 'BANNED')}
                                        >
                                            {isBanned ? t(locale, 'admin', 'copy.unban') : t(locale, 'admin', 'copy.ban')}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        ) : (
                            <Button type="button" variant="outline" size="sm" disabled>
                                {isBanned ? t(locale, 'admin', 'copy.unban') : t(locale, 'admin', 'copy.ban')}
                            </Button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 p-4">
                        <div className="grid min-w-0 flex-1 gap-0.5">
                            <p className="text-sm font-medium text-foreground">{t(locale, 'admin', 'copy.anonymizeUser')}</p>
                            <p className="text-xs text-muted-foreground">
                                {alreadyAnonymized
                                    ? t(locale, 'admin', 'copy.thisAccountIsAlreadyAnonymized')
                                    : deletionScheduledFor != null
                                      ? t(locale, 'admin', 'copy.accountDeletionScheduledFor', {
                                            date: formatDateTime(deletionScheduledFor, {
                                                locale,
                                                timeZone,
                                                dateStyle: 'medium',
                                                timeStyle: 'short',
                                            }),
                                        })
                                      : t(locale, 'admin', 'copy.removePersonalDataNullTheEmailEndSessionsBookingHistoryIsKep')}
                            </p>
                        </div>
                        {alreadyAnonymized ? (
                            <Button type="button" variant="destructive" size="sm" disabled>
                                {t(locale, 'admin', 'copy.anonymized')}
                            </Button>
                        ) : deletionScheduledFor != null ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={anonymizeBusy}
                                onClick={() => void onCancelScheduledDeletion()}
                            >
                                {t(locale, 'admin', 'copy.cancelScheduledDeletion')}
                            </Button>
                        ) : (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button type="button" variant="destructive" size="sm" disabled={anonymizeBusy}>
                                        {t(locale, 'admin', 'copy.anonymize')}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t(locale, 'admin', 'copy.anonymizeThisUserPermanently')}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {t(locale, 'admin', 'copy.thisCannotBeUndonePersonalDataWillBeRemovedAllSessionsEndedA')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="grid gap-2 py-2">
                                        <p className="text-sm font-medium text-foreground">{t(locale, 'admin', 'copy.anonymize')}</p>
                                        <Select
                                            value={anonymizeMode}
                                            onValueChange={(value) => setAnonymizeMode(value as GqlCAdminUserAnonymizeMode)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="IMMEDIATE">
                                                    {t(locale, 'admin', 'copy.anonymizeModeImmediate')}
                                                </SelectItem>
                                                <SelectItem value="SCHEDULE">{t(locale, 'admin', 'copy.anonymizeModeSchedule')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel disabled={anonymizeBusy}>{t(locale, 'admin', 'copy.cancel')}</AlertDialogCancel>
                                        <AlertDialogAction
                                            variant="destructive"
                                            disabled={anonymizeBusy}
                                            onClick={() => void onAnonymize()}
                                        >
                                            {t(locale, 'admin', 'copy.anonymize')}
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
