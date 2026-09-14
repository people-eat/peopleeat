// Server entry side-effect: passkey WebAuthn → `@peculiar/x509` → `tsyringe`
// requires the Reflect metadata polyfill before that graph evaluates. See
// `reflectMetadataForTsyringe` in `vite.config.ts`.
import 'reflect-metadata';
import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { parse, subscribe } from 'graphql';
import { serverRuntimeCreate } from '../domain/serverRuntimeCreate';
import { ensureJobsStarted } from '../jobs';
import { chatTurnRecover } from '../lib/chatTurnRecover';
import type { GqlSSession } from './generated';
import { resolversCreate } from './resolversCreate';
import schemaSource from './schema.graphqls?raw';

const serverRuntime = serverRuntimeCreate();

// Orphan queued/running turns from a previous process — no provider resume.
void chatTurnRecover(serverRuntime);

/** Shared runtime singleton (GraphQL + HTTP webhooks). */
export function serverRuntimeGet(): ReturnType<typeof serverRuntimeCreate> {
    return serverRuntime;
}

export const graphqlSchema = makeExecutableSchema({
    typeDefs: schemaSource,
    resolvers: resolversCreate(serverRuntime),
});

const graphqlServer = new ApolloServer({ schema: graphqlSchema });

// Concurrent GraphQL requests during cold start must share one in-flight
// start — a boolean flag races and Apollo rejects a second `start()`.
let serverStartPromise: Promise<void> | undefined;

async function ensureServerStarted() {
    if (!serverStartPromise) {
        serverStartPromise = (async () => {
            await graphqlServer.start();
            await ensureJobsStarted(serverRuntime);
        })();
    }
    await serverStartPromise;
}

export async function executeGraphQLQuery(
    query: string,
    variables: Record<string, any>,
    session: GqlSSession,
): Promise<{ data?: any; errors?: any }> {
    await ensureServerStarted();

    const result = await graphqlServer.executeOperation({ query, variables }, { contextValue: session });

    // URQL expects `{ data, errors }`; Apollo Server v5 wraps it in
    // `result.body` with a `kind` discriminator. We only emit single results
    // here — incremental delivery (`@defer`/`@stream`) is not used by any
    // operation in this app, so it's an error if we see one.
    let responseBody: { data?: any; errors?: any } = {};

    if (result.body.kind === 'single') {
        responseBody = {
            data: result.body.singleResult.data,
            errors: result.body.singleResult.errors,
        };
    } else {
        responseBody = {
            data: null,
            errors: [{ message: 'Unexpected incremental response format' }],
        };
    }

    return responseBody;
}

export async function executeGraphQLSubscription(
    query: string,
    variables: Record<string, any>,
    session: GqlSSession,
): Promise<AsyncIterableIterator<any>> {
    const document = parse(query);

    const result = await subscribe({
        schema: graphqlSchema,
        document,
        variableValues: variables,
        contextValue: session,
    });

    if (result instanceof Error) {
        throw result;
    }

    if (Symbol.asyncIterator in result) {
        return result as AsyncIterableIterator<any>;
    }

    // `subscribe()` returns a single `ExecutionResult` only when subscription
    // setup itself errored before the iterator was created (e.g. validation
    // failure). Surface that as a thrown error so the SSE handler can convert
    // it to an `errors` event.
    throw new Error('Subscription did not return an async iterable');
}
