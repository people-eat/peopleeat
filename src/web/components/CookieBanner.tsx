import { Link } from '@tanstack/react-router';
import { XIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { SessionStartupGatesCookieAcceptAllDocument, SessionStartupGatesCookieAcceptMandatoryDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
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
    const locale = useLocale();
    const [busy, setBusy] = useState(false);
    const [, acceptAll] = useMutation(SessionStartupGatesCookieAcceptAllDocument);
    const [, acceptMandatory] = useMutation(SessionStartupGatesCookieAcceptMandatoryDocument);

    async function onAcceptAll() {
        setBusy(true);
        try {
            const result = await acceptAll({});
            if (result.error || !result.data?.sessionCookieSettingAcceptAll.success) {
                toast.error({ de: 'Cookie-Einstellung konnte nicht gespeichert werden.', en: 'Could not save cookie preference.' }[locale]);
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
                toast.error({ de: 'Cookie-Einstellung konnte nicht gespeichert werden.', en: 'Could not save cookie preference.' }[locale]);
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
            aria-label={{ de: 'Cookie-Einstellungen', en: 'Cookie settings' }[locale]}
        >
            <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 text-xs @4xl:flex-row">
                <p className="text-muted-foreground">
                    {
                        {
                            de: 'Wir verwenden Cookies und ähnliche Technologien, um Inhalte zu personalisieren, das Nutzererlebnis zu verbessern und personalisierte Werbung bereitzustellen. Indem du auf „Alle akzeptieren“ klickst oder nur notwendige Cookies aktivierst, stimmst du der Verarbeitung deiner Daten zu. Du kannst deine Einwilligung zur Verarbeitung und Übermittlung personenbezogener Daten jederzeit widerrufen. Weitere Informationen findest du in unseren ',
                            en: 'We use cookies and similar technologies to personalize content, improve the user experience, and provide personalized advertising. By clicking “Accept all” or enabling only the necessary cookies, you agree to the processing of your data. You can withdraw your consent to the processing and transfer of personal data at any time. For more information, please refer to our ',
                        }[locale]
                    }
                    <Link
                        to="/{-$locale}/privacy-policy"
                        className="font-semibold text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                        {{ de: 'Datenschutzrichtlinien', en: 'Privacy Policy' }[locale]}
                    </Link>
                    .
                </p>
                <div className="flex w-full shrink-0 items-center gap-3 @4xl:w-auto">
                    <Button className="flex-1 @4xl:flex-none" disabled={busy} onClick={onAcceptMandatory} type="button" variant="outline">
                        {{ de: 'Nur notwendige', en: 'Only necessary' }[locale]}
                    </Button>
                    <Button className="flex-1 @4xl:flex-none" disabled={busy} onClick={onAcceptAll} type="button">
                        {{ de: 'Alle akzeptieren', en: 'Accept all' }[locale]}
                    </Button>
                    {dismissible && onDismiss ? (
                        <Button
                            aria-label={{ de: 'Schließen', en: 'Close' }[locale]}
                            disabled={busy}
                            onClick={onDismiss}
                            size="icon"
                            type="button"
                            variant="ghost"
                        >
                            <XIcon />
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
