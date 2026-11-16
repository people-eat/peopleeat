import { useLocation, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import type { Locale } from '../../shared';
import { SessionStartupGatesLocaleUserUpdateDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
import { buildLocaleHref, setLocaleCookie } from '../utils/locale';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './base/alert-dialog';

// Non-dismissible gate when a signed-in user's route locale differs from
// `Users.locale`. Yes updates the profile; No redirects to the profile locale.
// Open state is owned by SessionStartupGates (locale → legal → cookie).
export function LocaleMismatchGate({
    open,
    profileLocale,
    onResolved,
}: {
    open: boolean;
    profileLocale: Locale | null;
    onResolved: () => void;
}) {
    const routeLocale = useLocale();
    const navigate = useNavigate();
    const location = useLocation();
    const [busy, setBusy] = useState(false);
    const { t } = useT('common');

    const [, updateUser] = useMutation(SessionStartupGatesLocaleUserUpdateDocument);

    async function onChangeProfile() {
        setBusy(true);
        try {
            const result = await updateUser({ user: { locale: routeLocale } });
            if (result.error || !result.data?.user.userUpdate.success) {
                toast.error(t('localeMismatch.saveFailed'));
                return;
            }
            setLocaleCookie(routeLocale);
            onResolved();
        } finally {
            setBusy(false);
        }
    }

    function onKeepProfile() {
        if (!profileLocale) return;
        setLocaleCookie(profileLocale);
        navigate({ href: buildLocaleHref(location, routeLocale, profileLocale) });
    }

    return (
        <AlertDialog open={open}>
            <AlertDialogContent onEscapeKeyDown={(event) => event.preventDefault()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('localeMismatch.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('localeMismatch.body', {
                            routeLanguage: t(`language.${routeLocale}`),
                            profileLanguage: profileLocale ? t(`language.${profileLocale}`) : '',
                        })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={busy} onClick={onKeepProfile}>
                        {t('localeMismatch.keepProfile')}
                    </AlertDialogCancel>
                    <AlertDialogAction disabled={busy} onClick={() => void onChangeProfile()}>
                        {t('localeMismatch.changeProfile')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
