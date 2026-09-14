import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { useEffect, useState } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

type UserUpdatesData<TUser> = {
    userUpdates: TUser;
};

/**
 * Seed-and-subscribe for `userUpdates`.
 *
 * Seeds from the route loader fragment, re-seeds when the loader delivers a new
 * value, and replaces state on every SSE push. Mutations must not set owned
 * state or call `router.invalidate()` — commands publish after commit.
 *
 * @see docs/architecture/state-synchronization.md
 */
export function useUserUpdatesSeed<TUser, TVariables extends object = Record<string, never>>(
    seed: TUser | null,
    document: TypedDocumentNode<UserUpdatesData<TUser>, TVariables>,
    variables?: TVariables,
): TUser | null {
    const client = useClient();
    const [user, setUser] = useState<TUser | null>(seed);
    const variablesKey = variables == null ? '' : JSON.stringify(variables);

    useEffect(() => {
        setUser((previous) => (Object.is(previous, seed) ? previous : seed));
    }, [seed]);

    useEffect(() => {
        if (seed == null) return;
        const requestVariables = (variablesKey === '' ? {} : JSON.parse(variablesKey)) as TVariables;
        const request = createRequest(document, requestVariables);
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const next = result.data?.userUpdates;
                if (next) setUser(next);
            }),
        );
        return unsubscribe;
    }, [client, document, seed, variablesKey]);

    return user;
}
