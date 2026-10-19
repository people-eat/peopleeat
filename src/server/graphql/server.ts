// Server entry side-effect: passkey WebAuthn → `@peculiar/x509` → `tsyringe`
// requires the Reflect metadata polyfill before that graph evaluates. See
// `reflectMetadataForTsyringe` in `vite.config.ts`.
import 'reflect-metadata';
import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { parse, subscribe } from 'graphql';
import { serverRuntimeCreate } from '../domain/serverRuntimeCreate';
import { ensureJobsStarted } from '../jobs';
import { chatTurnRecover } from '../lib/chatTurnRecover';
import { graphqlErrorClass, graphqlOperationNameResolve, graphqlOperationType } from '../observability/graphqlOperationMeta';
import { observabilityStart } from '../observability/observabilityStart';
import { graphqlOperationRecord, graphqlOperationWindowRecord } from '../observability/redMetrics';
import type { GqlSSession } from './generated';
import { resolversCreate } from './resolversCreate';
import schemaSource from './schema.graphqls?raw';

observabilityStart();

const serverRuntime = serverRuntimeCreate();

const tracer = trace.getTracer('peopleeat.graphql');

export type GraphqlExecuteOptions = {
    operationName?: string | null;
};

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
    options: GraphqlExecuteOptions = {},
): Promise<{ data?: any; errors?: any }> {
    await ensureServerStarted();

    const operationName = graphqlOperationNameResolve({
        document: query,
        clientOperationName: options.operationName,
    });
    const operationType = graphqlOperationType(query);
    const startedAt = Date.now();

    return tracer.startActiveSpan(`graphql ${operationName}`, async (span) => {
        span.setAttribute('graphql.operation.name', operationName);
        span.setAttribute('graphql.operation.type', operationType);
        span.setAttribute('session.id', session.sessionId);
        if (session.userId) {
            span.setAttribute('enduser.id', session.userId);
        }

        try {
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

            const errored = Boolean(responseBody.errors?.length);
            const errorClass = graphqlErrorClass(responseBody.errors);
            if (errored) {
                span.setStatus({ code: SpanStatusCode.ERROR, message: 'GraphQL errors' });
                span.setAttribute('graphql.error.class', errorClass);
                span.setAttribute('graphql.error.count', responseBody.errors.length);
            }
            const durationMs = Date.now() - startedAt;
            graphqlOperationRecord({
                operationName,
                operationType,
                durationMs,
                errored,
                errorClass,
            });
            graphqlOperationWindowRecord(operationName, durationMs, errored);
            return responseBody;
        } catch (error) {
            span.recordException(error instanceof Error ? error : new Error(String(error)));
            span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : 'GraphQL throw' });
            const errorClass = graphqlErrorClass([{ message: error instanceof Error ? error.message : String(error) }]);
            span.setAttribute('graphql.error.class', errorClass);
            span.setAttribute('graphql.error.count', 1);
            const durationMs = Date.now() - startedAt;
            graphqlOperationRecord({
                operationName,
                operationType,
                durationMs,
                errored: true,
                errorClass,
            });
            graphqlOperationWindowRecord(operationName, durationMs, true);
            throw error;
        } finally {
            span.end();
        }
    });
}

export async function executeGraphQLSubscription(
    query: string,
    variables: Record<string, any>,
    session: GqlSSession,
    options: GraphqlExecuteOptions = {},
): Promise<AsyncIterableIterator<any>> {
    const operationName = graphqlOperationNameResolve({
        document: query,
        clientOperationName: options.operationName,
    });
    const operationType = graphqlOperationType(query);
    const startedAt = Date.now();

    return tracer.startActiveSpan(`graphql ${operationName}`, async (span) => {
        span.setAttribute('graphql.operation.name', operationName);
        span.setAttribute('graphql.operation.type', operationType);
        span.setAttribute('session.id', session.sessionId);
        if (session.userId) {
            span.setAttribute('enduser.id', session.userId);
        }

        try {
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
                const durationMs = Date.now() - startedAt;
                graphqlOperationRecord({
                    operationName,
                    operationType: 'subscription',
                    durationMs,
                    errored: false,
                });
                graphqlOperationWindowRecord(operationName, durationMs, false);
                return result as AsyncIterableIterator<any>;
            }

            // `subscribe()` returns a single `ExecutionResult` only when subscription
            // setup itself errored before the iterator was created (e.g. validation
            // failure). Surface that as a thrown error so the SSE handler can convert
            // it to an `errors` event.
            const setupErrors = 'errors' in result ? result.errors : undefined;
            const errorClass = graphqlErrorClass(setupErrors);
            span.setAttribute('graphql.error.class', errorClass);
            span.setAttribute('graphql.error.count', setupErrors?.length ?? 1);
            span.setStatus({ code: SpanStatusCode.ERROR, message: 'Subscription setup failed' });
            const durationMs = Date.now() - startedAt;
            graphqlOperationRecord({
                operationName,
                operationType: 'subscription',
                durationMs,
                errored: true,
                errorClass,
            });
            graphqlOperationWindowRecord(operationName, durationMs, true);
            throw new Error('Subscription did not return an async iterable');
        } catch (error) {
            if (!(error instanceof Error && error.message === 'Subscription did not return an async iterable')) {
                span.recordException(error instanceof Error ? error : new Error(String(error)));
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : 'Subscription setup throw',
                });
                const errorClass = graphqlErrorClass([{ message: error instanceof Error ? error.message : String(error) }]);
                span.setAttribute('graphql.error.class', errorClass);
                span.setAttribute('graphql.error.count', 1);
                const durationMs = Date.now() - startedAt;
                graphqlOperationRecord({
                    operationName,
                    operationType: 'subscription',
                    durationMs,
                    errored: true,
                    errorClass,
                });
                graphqlOperationWindowRecord(operationName, durationMs, true);
            }
            throw error;
        } finally {
            span.end();
        }
    });
}
