import { useLocation, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import type { Locale } from '../../shared';
import { SessionStartupGatesLocaleUserUpdateDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { buildLocalePath, setLocaleCookie } from '../utils/locale';
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

const LOCALE_LABEL = { de: 'Deutsch', en: 'English' } as const;

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

    const [, updateUser] = useMutation(SessionStartupGatesLocaleUserUpdateDocument);

    async function onChangeProfile() {
        setBusy(true);
        try {
            const result = await updateUser({ user: { locale: routeLocale } });
            if (result.error || !result.data?.user.userUpdate.success) {
                toast.error({ de: 'Sprache konnte nicht gespeichert werden.', en: 'Could not save language.' }[routeLocale]);
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
        navigate({ to: buildLocalePath(location.pathname, routeLocale, profileLocale) });
    }

    const dialogLocale = routeLocale;

    return (
        <AlertDialog open={open}>
            <AlertDialogContent onEscapeKeyDown={(event) => event.preventDefault()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {{ de: 'Sprache stimmt nicht überein', en: 'Language does not match' }[dialogLocale]}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {
                            {
                                de: `Die ausgewählte Sprache (${LOCALE_LABEL[routeLocale]}) ist nicht deine Profilsprache (${profileLocale ? LOCALE_LABEL[profileLocale] : ''}). Möchtest du deine Profilsprache ändern?`,
                                en: `The selected language (${LOCALE_LABEL[routeLocale]}) is not your profile language (${profileLocale ? LOCALE_LABEL[profileLocale] : ''}). Do you want to change your profile language?`,
                            }[dialogLocale]
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={busy} onClick={onKeepProfile}>
                        {{ de: 'Nein, Profilsprache behalten', en: 'No, keep profile language' }[dialogLocale]}
                    </AlertDialogCancel>
                    <AlertDialogAction disabled={busy} onClick={() => void onChangeProfile()}>
                        {{ de: 'Ja, Profilsprache ändern', en: 'Yes, change profile language' }[dialogLocale]}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
