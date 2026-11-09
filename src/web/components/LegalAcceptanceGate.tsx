import { useRouter } from '@tanstack/react-router';

import type { GqlCSessionStartupGatesQuery } from '../graphql/generated';
import { AlertDialog, AlertDialogContent } from './base/alert-dialog';
import { LegalAcceptancePanel } from './LegalAcceptancePanel';

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
    const router = useRouter();

    async function onPanelResolved() {
        onResolved();
        await router.invalidate();
    }

    return (
        <AlertDialog open={open}>
            <AlertDialogContent onEscapeKeyDown={(event) => event.preventDefault()}>
                <LegalAcceptancePanel layout="dialog" sessionId={sessionId} acceptance={acceptance} onResolved={onPanelResolved} />
            </AlertDialogContent>
        </AlertDialog>
    );
}
