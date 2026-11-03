import { useState } from 'react';
import { useMutation } from 'urql';

import { userDisplayName } from '../../shared';
import { SessionImpersonationEndDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { localePath } from '../utils/locale';
import { Button } from './base/button';

export function SessionImpersonationBanner({ user }: { user: { firstName: string; lastName: string } | null | undefined }) {
    const locale = useLocale();
    const [, endImpersonation] = useMutation(SessionImpersonationEndDocument);
    const [busy, setBusy] = useState(false);

    const displayName = user ? userDisplayName(user) : { de: 'Nutzer', en: 'user' }[locale];

    async function onReturn() {
        setBusy(true);
        try {
            const result = await endImpersonation({});
            if (result.error || !result.data?.sessionImpersonationEnd.success) {
                setBusy(false);
                return;
            }
            window.location.assign(localePath(locale, '/admin'));
        } catch {
            setBusy(false);
        }
    }

    return (
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-center gap-3 border-b border-amber-500/30 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <p className="text-center">
                {
                    {
                        de: `Angemeldet als ${displayName}.`,
                        en: `Signed in as ${displayName}.`,
                    }[locale]
                }
            </p>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void onReturn()}>
                {{ de: 'Zurück zum Admin', en: 'Return to admin' }[locale]}
            </Button>
        </div>
    );
}
