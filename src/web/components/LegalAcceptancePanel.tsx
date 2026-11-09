import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { SessionStartupGatesLegalAcceptDocument, SessionStartupGatesLegalSignOutDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { redirectAfterSignOut } from '../utils/locale';
import { AlertDialogAction, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './base/alert-dialog';
import { Button } from './base/button';

type LegalAcceptance = {
    required: boolean;
    pendingPrivacyPolicy: { changeSummaryDe: string } | null;
    pendingTermsAndConditions: { changeSummaryDe: string } | null;
};

const legalLinkClassName = 'text-sm underline-offset-4 hover:underline';

export function LegalAcceptancePanel({
    layout,
    sessionId,
    acceptance,
    fullTextInNewTab = false,
    onResolved,
}: {
    layout: 'dialog' | 'inline';
    sessionId: string | null;
    acceptance: LegalAcceptance | null;
    fullTextInNewTab?: boolean;
    onResolved: () => void | Promise<void>;
}) {
    const locale = useLocale();
    const [busy, setBusy] = useState(false);
    const [, acceptLegal] = useMutation(SessionStartupGatesLegalAcceptDocument);
    const [, signOut] = useMutation(SessionStartupGatesLegalSignOutDocument);

    const title = { de: 'Aktualisierte rechtliche Hinweise', en: 'Updated legal terms' }[locale];
    const description = {
        de: 'Bitte bestätige die aktuellen rechtlichen Texte, bevor du peopleeat weiter nutzt.',
        en: 'Please confirm the current legal texts before continuing to use peopleeat.',
    }[locale];
    const agreeLabel = { de: 'Ich stimme zu', en: 'I agree' }[locale];
    const signOutLabel = { de: 'Abmelden', en: 'Sign out' }[locale];
    const fullTextTarget = fullTextInNewTab ? '_blank' : undefined;
    const fullTextRel = fullTextInNewTab ? 'noreferrer' : undefined;

    async function onAccept() {
        setBusy(true);
        try {
            const result = await acceptLegal({});
            if (result.error || !result.data?.user.userLegalAccept.success) {
                toast.error({ de: 'Zustimmung konnte nicht gespeichert werden.', en: 'Could not save your acceptance.' }[locale]);
                return;
            }
            await onResolved();
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

    const pendingDocs = (
        <div className="grid gap-4 text-sm text-foreground">
            {acceptance?.pendingPrivacyPolicy ? (
                <div className="grid gap-1">
                    <p className="font-medium">{{ de: 'Datenschutzerklärung', en: 'Privacy policy' }[locale]}</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">{acceptance.pendingPrivacyPolicy.changeSummaryDe}</p>
                    <Link to="/{-$locale}/privacy-policy" target={fullTextTarget} rel={fullTextRel} className={legalLinkClassName}>
                        {{ de: 'Vollständigen Text lesen', en: 'Read full text' }[locale]}
                    </Link>
                </div>
            ) : null}
            {acceptance?.pendingTermsAndConditions ? (
                <div className="grid gap-1">
                    <p className="font-medium">{{ de: 'Allgemeine Geschäftsbedingungen', en: 'Terms and conditions' }[locale]}</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">{acceptance.pendingTermsAndConditions.changeSummaryDe}</p>
                    <Link to="/{-$locale}/terms-and-conditions" target={fullTextTarget} rel={fullTextRel} className={legalLinkClassName}>
                        {{ de: 'Vollständigen Text lesen', en: 'Read full text' }[locale]}
                    </Link>
                </div>
            ) : null}
        </div>
    );

    const signOutButton = (
        <Button type="button" variant="outline" disabled={busy} onClick={() => void onSignOut()}>
            {signOutLabel}
        </Button>
    );

    if (layout === 'dialog') {
        return (
            <>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                {pendingDocs}
                <AlertDialogFooter>
                    {signOutButton}
                    <AlertDialogAction disabled={busy} onClick={() => void onAccept()}>
                        {agreeLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </>
        );
    }

    return (
        <div className="grid gap-4">
            <div className="grid gap-1">
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {pendingDocs}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {signOutButton}
                <Button type="button" disabled={busy} onClick={() => void onAccept()}>
                    {agreeLabel}
                </Button>
            </div>
        </div>
    );
}
