import { Link } from '@tanstack/react-router';
import { XIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { SessionStartupGatesCookieAcceptAllDocument, SessionStartupGatesCookieAcceptMandatoryDocument } from '../graphql/generated';
import { useT } from '../hooks/useT';
import { Button } from './base/button';

export function CookieBanner({
    onDecided,
    onDismiss,
    dismissible = false,
}: {
    onDecided: () => void;
    onDismiss?: () => void;
    dismissible?: boolean;
}) {
    const { t } = useT('common');
    const [busy, setBusy] = useState(false);
    const [, acceptAll] = useMutation(SessionStartupGatesCookieAcceptAllDocument);
    const [, acceptMandatory] = useMutation(SessionStartupGatesCookieAcceptMandatoryDocument);

    async function onAcceptAll() {
        setBusy(true);
        try {
            const result = await acceptAll({});
            if (result.error || !result.data?.sessionCookieSettingAcceptAll.success) {
                toast.error(t('cookieBanner.saveFailed'));
                return;
            }
            onDecided();
        } finally {
            setBusy(false);
        }
    }

    async function onAcceptMandatory() {
        setBusy(true);
        try {
            const result = await acceptMandatory({});
            if (result.error || !result.data?.sessionCookieSettingAcceptMandatory.success) {
                toast.error(t('cookieBanner.saveFailed'));
                return;
            }
            onDecided();
        } finally {
            setBusy(false);
        }
    }

    return (
        <div
            className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background p-4 shadow-lg"
            role="dialog"
            aria-label={t('cookieBanner.ariaLabel')}
        >
            <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 text-xs @4xl:flex-row">
                <p className="text-muted-foreground">
                    {t('cookieBanner.body')}
                    <Link
                        to="/{-$locale}/privacy-policy"
                        className="font-semibold text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                        {t('cookieBanner.privacyPolicy')}
                    </Link>
                    .
                </p>
                <div className="flex w-full shrink-0 items-center gap-3 @4xl:w-auto">
                    <Button className="flex-1 @4xl:flex-none" disabled={busy} onClick={onAcceptMandatory} type="button" variant="outline">
                        {t('cookieBanner.onlyNecessary')}
                    </Button>
                    <Button className="flex-1 @4xl:flex-none" disabled={busy} onClick={onAcceptAll} type="button">
                        {t('cookieBanner.acceptAll')}
                    </Button>
                    {dismissible && onDismiss ? (
                        <Button aria-label={t('close')} disabled={busy} onClick={onDismiss} size="icon" type="button" variant="ghost">
                            <XIcon />
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
