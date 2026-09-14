import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { useEffect, useState } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

type SessionUpdatesData<TSession> = {
    sessionUpdates: TSession;
};

/**
 * Seed-and-subscribe for `sessionUpdates` (OTP / session-owned auth UI).
 *
 * @see docs/architecture/state-synchronization.md
 */
export function useSessionUpdatesSeed<TSession, TVariables extends object = Record<string, never>>(
    seed: TSession | null,
    document: TypedDocumentNode<SessionUpdatesData<TSession>, TVariables>,
    variables?: TVariables,
): TSession | null {
    const client = useClient();
    const [session, setSession] = useState<TSession | null>(seed);
    const variablesKey = variables == null ? '' : JSON.stringify(variables);

    useEffect(() => {
        setSession((previous) => (Object.is(previous, seed) ? previous : seed));
    }, [seed]);

    useEffect(() => {
        if (seed == null) return;
        const requestVariables = (variablesKey === '' ? {} : JSON.parse(variablesKey)) as TVariables;
        const request = createRequest(document, requestVariables);
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const next = result.data?.sessionUpdates;
                if (next) setSession(next);
            }),
        );
        return unsubscribe;
    }, [client, document, seed, variablesKey]);

    return session;
}
