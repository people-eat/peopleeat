import { useState } from 'react';
import { useMutation, useQuery } from 'urql';

import { SessionImpersonationEndDocument, SessionStartupGatesDocument } from '../graphql/generated';
import { localePath } from '../utils/locale';
import { sessionSwitchUrl } from '../utils/sessionSwitchUrl';
import { useLocale } from './useLocale';

/**
 * Shared probe + exit for admin Sign in as. Reuses the SessionStartupGates
 * query (cache-first) so nav chrome does not add another network round-trip.
 */
export function useSessionImpersonation() {
    const locale = useLocale();
    const [{ data }] = useQuery({ query: SessionStartupGatesDocument, requestPolicy: 'cache-first' });
    const [, endImpersonation] = useMutation(SessionImpersonationEndDocument);
    const [busy, setBusy] = useState(false);

    const active = Boolean(data?.currentSession.impersonation?.active);

    async function returnToAdmin() {
        setBusy(true);
        try {
            const result = await endImpersonation({});
            const toSessionId = result.data?.sessionImpersonationEnd.referenceId;
            if (result.error || !result.data?.sessionImpersonationEnd.success || !toSessionId) {
                setBusy(false);
                return;
            }
            window.location.assign(sessionSwitchUrl(toSessionId, localePath(locale, '/admin')));
        } catch {
            setBusy(false);
        }
    }

    return { active, busy, returnToAdmin };
}
