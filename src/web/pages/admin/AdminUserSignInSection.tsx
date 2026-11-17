import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { t } from '../../../i18n/t';
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
type AdminOauthIdentity = AdminUserRow['oauthIdentities'][number];

function passkeyDeviceLabel(deviceType: string | null | undefined, locale: Locale): string {
    if (deviceType === 'multiDevice') return t(locale, 'admin', 'copy.syncedPasskey');
    if (deviceType === 'singleDevice') return t(locale, 'admin', 'copy.passkeyOnOneDevice');
    return deviceType?.trim() || t(locale, 'admin', 'copy.passkey');
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
    oauthIdentities,
    disabled,
}: {
    userId: string;
    passkeys: AdminPasskey[];
    totp: AdminTotp;
    oauthIdentities: AdminOauthIdentity[];
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
                toast.error(t(locale, 'admin', 'copy.couldNotRemoveThePasskey'));
                return;
            }
            toast.success(t(locale, 'admin', 'copy.passkeyRemoved'));
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
                toast.error(t(locale, 'admin', 'copy.couldNotRemoveTwoFactor'));
                return;
            }
            toast.success(t(locale, 'admin', 'copy.twoFactorRemoved'));
            await router.invalidate();
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="grid max-w-3xl gap-4">
            <div className="grid gap-1">
                <h3 className="text-sm font-medium text-foreground">{t(locale, 'admin', 'copy.signInAndSecurity')}</h3>
                <p className="text-sm text-muted-foreground">
                    {t(locale, 'admin', 'copy.passkeysTheAuthenticatorAppAndLinkedSocialLoginsRemovalAppli')}
                </p>
            </div>

            <div className="grid gap-3">
                <h4 className="text-sm font-medium text-foreground">{t(locale, 'admin', 'copy.google')}</h4>
                {oauthIdentities.filter((identity) => identity.provider === 'GOOGLE').length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noGoogleAccountLinked')}</p>
                ) : (
                    <ul className="divide-y divide-border overflow-hidden rounded-xl border bg-card">
                        {oauthIdentities
                            .filter((identity) => identity.provider === 'GOOGLE')
                            .map((identity) => (
                                <li key={`${identity.provider}-${identity.createdAt}`} className="grid gap-0.5 bg-card px-4 py-3">
                                    <p className="text-sm text-foreground">{t(locale, 'admin', 'copy.googleLinked')}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDate(identity.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                                    </p>
                                </li>
                            ))}
                    </ul>
                )}
            </div>

            <div className="grid gap-3">
                <h4 className="text-sm font-medium text-foreground">{t(locale, 'admin', 'copy.facebook')}</h4>
                {oauthIdentities.filter((identity) => identity.provider === 'FACEBOOK').length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noFacebookAccountLinked')}</p>
                ) : (
                    <ul className="divide-y divide-border overflow-hidden rounded-xl border bg-card">
                        {oauthIdentities
                            .filter((identity) => identity.provider === 'FACEBOOK')
                            .map((identity) => (
                                <li key={`${identity.provider}-${identity.createdAt}`} className="grid gap-0.5 bg-card px-4 py-3">
                                    <p className="text-sm text-foreground">{t(locale, 'admin', 'copy.facebookLinked')}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDate(identity.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                                    </p>
                                </li>
                            ))}
                    </ul>
                )}
            </div>

            <div className="grid gap-3">
                <h4 className="text-sm font-medium text-foreground">{t(locale, 'admin', 'copy.passkeys')}</h4>
                {passkeys.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noPasskeysOnThisAccount')}</p>
                ) : (
                    <ul className="divide-y divide-border overflow-hidden rounded-xl border bg-card">
                        {passkeys.map((passkey) => (
                            <li key={passkey.authPasskeyId} className="flex items-center justify-between gap-4 bg-card px-4 py-3">
                                <div className="grid min-w-0 gap-0.5">
                                    <p className="truncate text-sm text-foreground">
                                        {passkeyDeviceLabel(passkey.deviceType, locale)}
                                        {passkey.backedUp ? t(locale, 'admin', 'copy.backedUp') : ''}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDate(passkey.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                                    </p>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button type="button" variant="destructive" size="sm" disabled={locked}>
                                            {t(locale, 'admin', 'copy.remove')}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t(locale, 'admin', 'copy.removeThisPasskey')}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {t(locale, 'admin', 'copy.signInWithThisPasskeyWillNoLongerWorkOtherPasskeysAndEmailSi')}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel disabled={locked}>{t(locale, 'admin', 'copy.cancel')}</AlertDialogCancel>
                                            <AlertDialogAction
                                                variant="destructive"
                                                disabled={locked}
                                                onClick={() => void onPasskeyDelete(passkey.authPasskeyId)}
                                            >
                                                {t(locale, 'admin', 'copy.remove')}
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
                <h4 className="text-sm font-medium text-foreground">{t(locale, 'admin', 'copy.twoFactorAuthentication')}</h4>
                {totp == null ? (
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noAuthenticatorAppIsSetUp')}</p>
                ) : (
                    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3">
                        <div className="grid min-w-0 gap-0.5">
                            <p className="text-sm text-foreground">
                                {totp.confirmedAt == null
                                    ? t(locale, 'admin', 'copy.enrollmentStartedNotConfirmedYet')
                                    : t(locale, 'admin', 'copy.on')}
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
                                    {t(locale, 'admin', 'copy.remove')}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{t(locale, 'admin', 'copy.removeTwoFactor')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {t(locale, 'admin', 'copy.theAuthenticatorAppIsRemovedSignInThenOnlyNeedsEmailOrAPassk')}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={locked}>{t(locale, 'admin', 'copy.cancel')}</AlertDialogCancel>
                                    <AlertDialogAction variant="destructive" disabled={locked} onClick={() => void onTotpDelete()}>
                                        {t(locale, 'admin', 'copy.remove')}
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
