import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { formatDate } from '../../../shared';
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
import { Button } from '../../components/base/button';
import type { GqlCAdminUserPageQuery } from '../../graphql/generated';
import { AdminUserPasskeyDeleteDocument, AdminUserTotpDeleteDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';

type AdminUserRow = NonNullable<NonNullable<NonNullable<GqlCAdminUserPageQuery['currentSession']['user']>['admin']>['user']>;
type AdminPasskey = AdminUserRow['passkeys'][number];
type AdminTotp = AdminUserRow['timeBasedOneTimePassword'];

function passkeyDeviceLabel(deviceType: string | null | undefined, locale: Locale): string {
    if (deviceType === 'multiDevice') return { de: 'Synchronisierter Passkey', en: 'Synced passkey' }[locale];
    if (deviceType === 'singleDevice') return { de: 'Passkey auf einem Gerät', en: 'Passkey on one device' }[locale];
    return deviceType?.trim() || { de: 'Passkey', en: 'Passkey' }[locale];
}

function recoveryCodesLabel(count: number, locale: Locale): string {
    if (locale === 'de') {
        return count === 1 ? '1 Wiederherstellungscode übrig' : `${count} Wiederherstellungscodes übrig`;
    }
    return count === 1 ? '1 recovery code left' : `${count} recovery codes left`;
}

export function AdminUserSignInSection({
    userId,
    passkeys,
    totp,
    disabled,
}: {
    userId: string;
    passkeys: AdminPasskey[];
    totp: AdminTotp;
    disabled: boolean;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const router = useRouter();
    const [, deletePasskey] = useMutation(AdminUserPasskeyDeleteDocument);
    const [, deleteTotp] = useMutation(AdminUserTotpDeleteDocument);
    const [busy, setBusy] = useState(false);
    const locked = disabled || busy;

    async function onPasskeyDelete(authPasskeyId: string) {
        setBusy(true);
        try {
            const result = await deletePasskey({ userId, authPasskeyId });
            if (result.error || !result.data?.admin.userPasskeyDelete.success) {
                toast.error({ de: 'Passkey konnte nicht entfernt werden.', en: 'Could not remove the passkey.' }[locale]);
                return;
            }
            toast.success({ de: 'Passkey entfernt.', en: 'Passkey removed.' }[locale]);
            await router.invalidate();
        } finally {
            setBusy(false);
        }
    }

    async function onTotpDelete() {
        setBusy(true);
        try {
            const result = await deleteTotp({ userId });
            if (result.error || !result.data?.admin.userTotpDelete.success) {
                toast.error({ de: 'Zwei-Faktor konnte nicht entfernt werden.', en: 'Could not remove two-factor.' }[locale]);
                return;
            }
            toast.success({ de: 'Zwei-Faktor entfernt.', en: 'Two-factor removed.' }[locale]);
            await router.invalidate();
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="grid max-w-3xl gap-4">
            <div className="grid gap-1">
                <h3 className="text-sm font-medium text-foreground">
                    {{ de: 'Anmeldung und Sicherheit', en: 'Sign-in and security' }[locale]}
                </h3>
                <p className="text-sm text-muted-foreground">
                    {
                        {
                            de: 'Passkeys und Authenticator-App. Entfernen gilt sofort. Die Anmeldung per E-Mail-Code bleibt.',
                            en: 'Passkeys and the authenticator app. Removal applies immediately. Sign-in with an email code stays available.',
                        }[locale]
                    }
                </p>
            </div>

            <div className="grid gap-3">
                <h4 className="text-sm font-medium text-foreground">{{ de: 'Passkeys', en: 'Passkeys' }[locale]}</h4>
                {passkeys.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {{ de: 'Keine Passkeys hinterlegt.', en: 'No passkeys on this account.' }[locale]}
                    </p>
                ) : (
                    <ul className="divide-y divide-border overflow-hidden rounded-xl border bg-card">
                        {passkeys.map((passkey) => (
                            <li key={passkey.authPasskeyId} className="flex items-center justify-between gap-4 bg-card px-4 py-3">
                                <div className="grid min-w-0 gap-0.5">
                                    <p className="truncate text-sm text-foreground">
                                        {passkeyDeviceLabel(passkey.deviceType, locale)}
                                        {passkey.backedUp ? { de: ' · gesichert', en: ' · backed up' }[locale] : ''}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDate(passkey.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                                    </p>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button type="button" variant="destructive" size="sm" disabled={locked}>
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
                                                        de: 'Mit diesem Passkey ist keine Anmeldung mehr möglich. Andere Passkeys und die Anmeldung per E-Mail bleiben.',
                                                        en: 'Sign-in with this passkey will no longer work. Other passkeys and email sign-in stay available.',
                                                    }[locale]
                                                }
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel disabled={locked}>
                                                {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                                variant="destructive"
                                                disabled={locked}
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
            </div>

            <div className="grid gap-3">
                <h4 className="text-sm font-medium text-foreground">
                    {{ de: 'Zwei-Faktor-Authentifizierung', en: 'Two-factor authentication' }[locale]}
                </h4>
                {totp == null ? (
                    <p className="text-sm text-muted-foreground">
                        {{ de: 'Keine Authenticator-App eingerichtet.', en: 'No authenticator app is set up.' }[locale]}
                    </p>
                ) : (
                    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3">
                        <div className="grid min-w-0 gap-0.5">
                            <p className="text-sm text-foreground">
                                {totp.confirmedAt == null
                                    ? { de: 'Einrichtung begonnen, noch nicht bestätigt.', en: 'Enrollment started, not confirmed yet.' }[
                                          locale
                                      ]
                                    : { de: 'Aktiv', en: 'On' }[locale]}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {totp.confirmedAt == null
                                    ? formatDate(totp.createdAt, { locale, timeZone, dateStyle: 'medium' })
                                    : `${formatDate(totp.confirmedAt, { locale, timeZone, dateStyle: 'medium' })} · ${recoveryCodesLabel(totp.recoveryCodesRemaining, locale)}`}
                            </p>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="destructive" size="sm" disabled={locked}>
                                    {{ de: 'Entfernen', en: 'Remove' }[locale]}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        {{ de: 'Zwei-Faktor entfernen?', en: 'Remove two-factor?' }[locale]}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {
                                            {
                                                de: 'Die Authenticator-App wird entfernt. Die Anmeldung braucht danach nur noch E-Mail oder einen Passkey. Ein laufender Zweitfaktor-Schritt wird abgebrochen.',
                                                en: 'The authenticator app is removed. Sign-in then only needs email or a passkey. An in-progress second-factor step is cancelled.',
                                            }[locale]
                                        }
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={locked}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                                    <AlertDialogAction variant="destructive" disabled={locked} onClick={() => void onTotpDelete()}>
                                        {{ de: 'Entfernen', en: 'Remove' }[locale]}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}
            </div>
        </section>
    );
}
