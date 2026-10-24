import { createClient as createSSEClient } from 'graphql-sse';
import { createClient, errorExchange, fetchExchange, subscriptionExchange } from 'urql';

import { clientObservabilityGraphqlErrorReport, clientObservabilityIsReportOperation } from '../observability/clientObservability';

// URQL ships with a GET-with-query-params default for queries, which trips up
// proxies that cap URL length and complicates request logging. We force every
// GraphQL operation to POST, transcoding any incoming GET-with-query into a
// JSON body.
const urqlPostFetch: typeof fetch = async (url, options) => {
    const urlString = typeof url === 'string' ? url : url instanceof URL ? url.href : url.toString();

    const urlObj = new URL(urlString, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');

    const isGetWithQueryParams = (!options || !options.method || options.method === 'GET') && urlObj.searchParams.has('query');

    if (isGetWithQueryParams) {
        const query = urlObj.searchParams.get('query');
        const variables = urlObj.searchParams.get('variables');
        const operationName = urlObj.searchParams.get('operationName');

        return fetch(urlObj.pathname, {
            ...options,
            method: 'POST',
            headers: {
                ...options?.headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                variables: variables ? JSON.parse(variables) : undefined,
                ...(operationName ? { operationName } : {}),
            }),
            credentials: options?.credentials || 'same-origin',
        });
    }

    return fetch(url, {
        ...options,
        method: options?.method || 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        credentials: options?.credentials || 'same-origin',
    });
};

// Subscriptions ride graphql-sse in distinct-connections mode (POST + body to
// `/api/stream`). The POST transcoding above only applies to the URQL fetch exchange.
const sseClient = createSSEClient({
    url: '/api/stream',
    credentials: 'same-origin',
});

const clientErrorExchange = errorExchange({
    onError(error, operation) {
        const operationName = operation.query.definitions.find((definition) => definition.kind === 'OperationDefinition')?.name?.value;
        if (clientObservabilityIsReportOperation(operationName)) {
            return;
        }
        const message = error.graphQLErrors[0]?.message ?? error.networkError?.message ?? error.message;
        clientObservabilityGraphqlErrorReport(operationName, message);
    },
});

export const urqlClient = createClient({
    url: '/api/graphql',
    fetch: urqlPostFetch,
    fetchOptions: {
        method: 'POST',
        credentials: 'same-origin',
    },
    preferGetMethod: false,
    requestPolicy: 'cache-first',
    exchanges: [
        clientErrorExchange,
        fetchExchange,
        subscriptionExchange({
            forwardSubscription: (operation) => {
                return {
                    subscribe: (sink) => {
                        const dispose = sseClient.subscribe(operation as any, sink);
                        return {
                            unsubscribe: dispose,
                        };
                    },
                };
            },
        }),
    ],
});

// Cache-free, subscription-free variant used by `routeLoaderGraphqlClient` for
// one-shot loader queries — route loaders manage their own cache lifecycle, so
// URQL's would just duplicate it. `network-only` keeps client navigations from
// reseeding seed-and-subscribe pages with a stale in-memory result.
export const urqlClientSimple = createClient({
    url: '/api/graphql',
    fetch: urqlPostFetch,
    fetchOptions: {
        method: 'POST',
        credentials: 'same-origin',
    },
    preferGetMethod: false,
    requestPolicy: 'network-only',
    exchanges: [clientErrorExchange, fetchExchange],
});
