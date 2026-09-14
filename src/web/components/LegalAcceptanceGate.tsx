import { Link, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import type { GqlCSessionStartupGatesQuery } from '../graphql/generated';
import { SessionStartupGatesLegalAcceptDocument, SessionStartupGatesLegalSignOutDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { redirectAfterSignOut } from '../utils/locale';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './base/alert-dialog';
import { Button } from './base/button';

type LegalAcceptance = NonNullable<NonNullable<GqlCSessionStartupGatesQuery['currentSession']['user']>['legalAcceptance']>;

// Non-dismissible gate for signed-in users who must accept the latest
// published privacy policy and/or terms. Escape hatch: accept, or sign out
// via terminateSessions (allowed while pending). Open state is owned by
// SessionStartupGates (locale → legal → cookie); public privacy/terms paths
// suppress eligibility in the orchestrator so “Read full text” works.
export function LegalAcceptanceGate({
    open,
    sessionId,
    acceptance,
    onResolved,
}: {
    open: boolean;
    sessionId: string | null;
    acceptance: LegalAcceptance | null;
    onResolved: () => void;
}) {
    const locale = useLocale();
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    const [, acceptLegal] = useMutation(SessionStartupGatesLegalAcceptDocument);
    const [, signOut] = useMutation(SessionStartupGatesLegalSignOutDocument);

    async function onAccept() {
        setBusy(true);
        try {
            const result = await acceptLegal({});
            if (result.error || !result.data?.user.userLegalAccept.success) {
                toast.error({ de: 'Zustimmung konnte nicht gespeichert werden.', en: 'Could not save your acceptance.' }[locale]);
                return;
            }
            onResolved();
            await router.invalidate();
        } finally {
            setBusy(false);
        }
    }

    async function onSignOut() {
        if (!sessionId) return;
        setBusy(true);
        try {
            const result = await signOut({ sessionIds: [sessionId] });
            if (result.error || !result.data?.user.terminateSessions.success) {
                toast.error({ de: 'Abmelden fehlgeschlagen.', en: 'Sign-out failed.' }[locale]);
                return;
            }
            toast.success({ de: 'Abgemeldet.', en: 'Signed out.' }[locale]);
            redirectAfterSignOut(locale);
        } finally {
            setBusy(false);
        }
    }

    return (
        <AlertDialog open={open}>
            <AlertDialogContent onEscapeKeyDown={(event) => event.preventDefault()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ de: 'Aktualisierte rechtliche Hinweise', en: 'Updated legal terms' }[locale]}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {
                            {
                                de: 'Bitte bestätige die aktuellen rechtlichen Texte, bevor du peopleeat weiter nutzt.',
                                en: 'Please confirm the current legal texts before continuing to use peopleeat.',
                            }[locale]
                        }
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="grid gap-4 text-sm text-foreground">
                    {acceptance?.pendingPrivacyPolicy ? (
                        <div className="grid gap-1">
                            <p className="font-medium">{{ de: 'Datenschutzerklärung', en: 'Privacy policy' }[locale]}</p>
                            <p className="whitespace-pre-wrap text-muted-foreground">{acceptance.pendingPrivacyPolicy.changeSummaryDe}</p>
                            <Link to="/{-$locale}/privacy-policy" className="text-sm underline-offset-4 hover:underline">
                                {{ de: 'Vollständigen Text lesen', en: 'Read full text' }[locale]}
                            </Link>
                        </div>
                    ) : null}
                    {acceptance?.pendingTermsAndConditions ? (
                        <div className="grid gap-1">
                            <p className="font-medium">{{ de: 'Allgemeine Geschäftsbedingungen', en: 'Terms and conditions' }[locale]}</p>
                            <p className="whitespace-pre-wrap text-muted-foreground">
                                {acceptance.pendingTermsAndConditions.changeSummaryDe}
                            </p>
                            <Link to="/{-$locale}/terms-and-conditions" className="text-sm underline-offset-4 hover:underline">
                                {{ de: 'Vollständigen Text lesen', en: 'Read full text' }[locale]}
                            </Link>
                        </div>
                    ) : null}
                </div>

                <AlertDialogFooter>
                    <Button type="button" variant="outline" disabled={busy} onClick={() => void onSignOut()}>
                        {{ de: 'Abmelden', en: 'Sign out' }[locale]}
                    </Button>
                    <AlertDialogAction disabled={busy} onClick={() => void onAccept()}>
                        {{ de: 'Ich stimme zu', en: 'I agree' }[locale]}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
