import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequest, getRequestHeader, getRequestHost, getRequestProtocol, setResponseHeader } from '@tanstack/react-start/server';
import { print } from 'graphql';
import type { DocumentNode } from 'graphql';
import { urqlClientSimple } from './client';

const printedDocumentCache = new WeakMap<DocumentNode, string>();

function printCached(document: DocumentNode): string {
    let printed = printedDocumentCache.get(document);
    if (!printed) {
        printed = print(document);
        printedDocumentCache.set(document, printed);
    }
    return printed;
}

type GraphqlResponse<TData> = {
    data?: TData;
    errors?: Array<{ message?: string }>;
};

type VariablesParam<TVariables> = TVariables extends Record<string, never> ? [] : [variables: TVariables];

// Absolute origin for the SSR → /api/graphql hop. Must honour X-Forwarded-Proto
// / Host: `request.url` from srvx ≥0.11.22 ignores forwarded headers unless
// trustProxy is enabled, so behind Coolify/Traefik it becomes `http://…`.
// Fetch then follows Traefik's HTTP→HTTPS 307 and drops the Cookie header
// (http→https is a cross-origin redirect for fetch), minting a new session on
// every document load. h3's getRequestProtocol/Host still trust X-Forwarded-*
// by default — see docs/architecture/api-layer.md.
function ssrGraphqlOrigin(): string {
    return `${getRequestProtocol()}://${getRequestHost()}`;
}

const executeGraphqlRequest: <TData, TVariables>(
    document: TypedDocumentNode<TData, TVariables>,
    variables: TVariables | undefined,
) => Promise<TData> = createIsomorphicFn()
    .server(
        async <TData, TVariables>(document: TypedDocumentNode<TData, TVariables>, variables: TVariables | undefined): Promise<TData> => {
            const request = getRequest();

            const headersToForward = [
                'cookie',
                'user-agent',
                'accept-language',
                'x-forwarded-for',
                'x-real-ip',
                'origin',
                'referer',
            ] as const;
            const forwardedHeaders: Record<string, string> = {};
            for (const name of headersToForward) {
                const value = getRequestHeader(name);
                if (value) forwardedHeaders[name] = value;
            }
            // First-touch landing path for session attribution — only present on
            // SSR loader GraphQL calls (the browser page URL, not /api/graphql).
            try {
                forwardedHeaders['x-landing-path'] = new URL(request.url).pathname;
            } catch {
                // Ignore malformed request URLs; session create tolerates null.
            }

            const response = await fetch(new URL('/api/graphql', `${ssrGraphqlOrigin()}/`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...forwardedHeaders,
                },
                body: JSON.stringify({
                    query: printCached(document),
                    variables,
                }),
            });

            for (const cookie of response.headers.getSetCookie()) {
                setResponseHeader('Set-Cookie', cookie);
            }

            let result: GraphqlResponse<TData>;
            try {
                result = (await response.json()) as GraphqlResponse<TData>;
            } catch {
                throw new Error(`GraphQL request failed with status ${response.status}`);
            }

            if (!response.ok) {
                throw new Error(result.errors?.[0]?.message ?? `GraphQL request failed with status ${response.status}`);
            }

            if (result.errors?.length) {
                throw new Error(result.errors[0]?.message ?? 'GraphQL request failed.');
            }

            if (!result.data) {
                throw new Error('GraphQL response missing data.');
            }

            return result.data;
        },
    )
    .client(
        async <TData, TVariables>(document: TypedDocumentNode<TData, TVariables>, variables: TVariables | undefined): Promise<TData> => {
            const result = await urqlClientSimple.query(document, variables as any).toPromise();
            if (result.error) {
                throw result.error;
            }
            if (!result.data) {
                throw new Error('GraphQL response missing data.');
            }
            return result.data;
        },
    ) as unknown as <TData, TVariables>(
    document: TypedDocumentNode<TData, TVariables>,
    variables: TVariables | undefined,
) => Promise<TData>;

export function routeLoaderGraphqlClient<TData, TVariables>(
    document: TypedDocumentNode<TData, TVariables>,
    ...args: VariablesParam<TVariables>
) {
    const variables = args.length ? args[0] : undefined;
    return () => executeGraphqlRequest(document, variables);
}
