import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { SessionStartupGatesLegalAcceptDocument, SessionStartupGatesLegalSignOutDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
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
    const { t } = useT('common');
    const [busy, setBusy] = useState(false);
    const [, acceptLegal] = useMutation(SessionStartupGatesLegalAcceptDocument);
    const [, signOut] = useMutation(SessionStartupGatesLegalSignOutDocument);

    const fullTextTarget = fullTextInNewTab ? '_blank' : undefined;
    const fullTextRel = fullTextInNewTab ? 'noreferrer' : undefined;

    async function onAccept() {
        setBusy(true);
        try {
            const result = await acceptLegal({});
            if (result.error || !result.data?.user.userLegalAccept.success) {
                toast.error(t('legalAcceptance.acceptFailed'));
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
                toast.error(t('legalAcceptance.signOutFailed'));
                return;
            }
            toast.success(t('legalAcceptance.signedOut'));
            redirectAfterSignOut(locale);
        } finally {
            setBusy(false);
        }
    }

    const pendingDocs = (
        <div className="grid gap-4 text-sm text-foreground">
            {acceptance?.pendingPrivacyPolicy ? (
                <div className="grid gap-1">
                    <p className="font-medium">{t('legalAcceptance.privacyPolicy')}</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">{acceptance.pendingPrivacyPolicy.changeSummaryDe}</p>
                    <Link to="/{-$locale}/privacy-policy" target={fullTextTarget} rel={fullTextRel} className={legalLinkClassName}>
                        {t('legalAcceptance.readFull')}
                    </Link>
                </div>
            ) : null}
            {acceptance?.pendingTermsAndConditions ? (
                <div className="grid gap-1">
                    <p className="font-medium">{t('legalAcceptance.terms')}</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">{acceptance.pendingTermsAndConditions.changeSummaryDe}</p>
                    <Link to="/{-$locale}/terms-and-conditions" target={fullTextTarget} rel={fullTextRel} className={legalLinkClassName}>
                        {t('legalAcceptance.readFull')}
                    </Link>
                </div>
            ) : null}
        </div>
    );

    const signOutButton = (
        <Button type="button" variant="outline" disabled={busy} onClick={() => void onSignOut()}>
            {t('legalAcceptance.signOut')}
        </Button>
    );

    if (layout === 'dialog') {
        return (
            <>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('legalAcceptance.title')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('legalAcceptance.description')}</AlertDialogDescription>
                </AlertDialogHeader>
                {pendingDocs}
                <AlertDialogFooter>
                    {signOutButton}
                    <AlertDialogAction disabled={busy} onClick={() => void onAccept()}>
                        {t('legalAcceptance.agree')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </>
        );
    }

    return (
        <div className="grid gap-4">
            <div className="grid gap-1">
                <p className="font-medium">{t('legalAcceptance.title')}</p>
                <p className="text-sm text-muted-foreground">{t('legalAcceptance.description')}</p>
            </div>
            {pendingDocs}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {signOutButton}
                <Button type="button" disabled={busy} onClick={() => void onAccept()}>
                    {t('legalAcceptance.agree')}
                </Button>
            </div>
        </div>
    );
}
