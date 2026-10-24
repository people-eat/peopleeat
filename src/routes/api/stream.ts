import { createFileRoute } from '@tanstack/react-router';
import { db } from '../../server/db';
import { environmentVariables } from '../../server/env/environmentVariablesCreate';
import type { GqlSSession } from '../../server/graphql/generated';
import { executeGraphQLSubscription } from '../../server/graphql/server';
import { graphqlOperationNameResolve } from '../../server/observability/graphqlOperationMeta';
import { graphqlSubscriptionConnectionRecord } from '../../server/observability/redMetrics';
import { clientIpFromRequest } from '../../server/utils/clientIpFromRequest';
import { isClientConnectionAbortError } from '../../server/utils/isClientConnectionAbortError';
import { loggerCreate } from '../../server/utils/loggerCreate';
import { sessionUpsert } from '../../server/utils/sessionUpsert';
import { sessionUtils } from '../../server/utils/sessionUtils';

const log = loggerCreate(db);

const encoder = new TextEncoder();

/** GraphQL-over-SSE requires a named `event` (`next` | `complete`). Bare `data:` frames make graphql-sse throw "Missing message event". */
function sseNext(eventId: number, data: unknown): Uint8Array {
    return encoder.encode(`id: ${eventId}\nevent: next\ndata: ${JSON.stringify(data)}\n\n`);
}

function sseComplete(): Uint8Array {
    return encoder.encode('event: complete\ndata:\n\n');
}

function isControllerClosedError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }
    const { message, code } = error as { message?: unknown; code?: unknown };
    return code === 'ERR_INVALID_STATE' || (typeof message === 'string' && message.includes('closed'));
}

function enqueueSafe(controller: ReadableStreamDefaultController<Uint8Array>, chunk: Uint8Array): boolean {
    if (controller.desiredSize === null) {
        return false;
    }
    try {
        controller.enqueue(chunk);
        return true;
    } catch (error) {
        if (isControllerClosedError(error) || isClientConnectionAbortError(error)) {
            return false;
        }
        throw error;
    }
}

function closeSafe(controller: ReadableStreamDefaultController<Uint8Array>): void {
    if (controller.desiredSize === null) {
        return;
    }
    try {
        controller.close();
    } catch {
        // Already closed by a concurrent cancel.
    }
}

function createSubscriptionStream(
    controller: ReadableStreamDefaultController<Uint8Array>,
    query: string,
    variables: Record<string, any>,
    session: GqlSSession,
    operationName: string,
) {
    let activeSubscriptionIterator: AsyncIterator<any> | null = null;
    const connectionStartedAt = Date.now();
    let eventCount = 0;
    let connectionErrored = false;
    let connectionRecorded = false;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    const recordConnection = () => {
        if (connectionRecorded) {
            return;
        }
        connectionRecorded = true;
        if (pingTimer) {
            clearInterval(pingTimer);
            pingTimer = null;
        }
        graphqlSubscriptionConnectionRecord({
            operationName,
            durationMs: Date.now() - connectionStartedAt,
            eventCount,
            errored: connectionErrored,
        });
    };

    // Initial padding forces proxies (e.g. nginx) to flush early so the client
    // receives the open event immediately instead of after the proxy buffer
    // fills.
    const initialPadding = ' '.repeat(2048);
    enqueueSafe(controller, encoder.encode(`: connected${initialPadding}\n\n`));

    // Keep-alive pings (SSE comments) so idle proxies do not close long-lived subscriptions.
    pingTimer = setInterval(() => {
        enqueueSafe(controller, encoder.encode(':\n\n'));
    }, 12_000);

    let eventId = 0;
    (async () => {
        try {
            const subscriptionIterator = await executeGraphQLSubscription(query, variables, session, {
                operationName,
            });
            activeSubscriptionIterator = subscriptionIterator;

            for await (const result of subscriptionIterator) {
                if (!enqueueSafe(controller, sseNext(++eventId, result))) {
                    break;
                }
                eventCount += 1;
            }

            if (enqueueSafe(controller, sseComplete())) {
                closeSafe(controller);
            }
        } catch (iterError: unknown) {
            if (isClientConnectionAbortError(iterError) || isControllerClosedError(iterError)) {
                return;
            }

            connectionErrored = true;
            const message = iterError instanceof Error ? iterError.message : String(iterError);
            log.error(iterError instanceof Error ? iterError : new Error(message), session);

            if (enqueueSafe(controller, sseNext(++eventId, { errors: [{ message }] }))) {
                enqueueSafe(controller, sseComplete());
                closeSafe(controller);
            }
        } finally {
            recordConnection();
        }
    })();

    return {
        cleanup: () => {
            if (activeSubscriptionIterator && typeof activeSubscriptionIterator.return === 'function') {
                void activeSubscriptionIterator.return();
            }
            recordConnection();
        },
    };
}

export const Route = createFileRoute('/api/stream')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                const existingSessionId = sessionUtils.getSessionIdFromRequest(environmentVariables.sessionCookie, request);
                const session = await sessionUpsert(
                    db,
                    log,
                    existingSessionId,
                    request.headers.get('user-agent'),
                    clientIpFromRequest(request),
                    request.headers.get('referer'),
                    request.headers.get('x-landing-path'),
                );

                try {
                    const body = await request.json();
                    const query = body.query || null;
                    const variables = body.variables || undefined;
                    const clientOperationName = typeof body.operationName === 'string' ? body.operationName : undefined;

                    if (!query) {
                        return new Response(
                            JSON.stringify({
                                errors: [{ message: 'Missing query parameter' }],
                            }),
                            {
                                status: 400,
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Set-Cookie': sessionUtils.createSetSessionCookie(environmentVariables.sessionCookie, session),
                                },
                            },
                        );
                    }

                    const operationName = graphqlOperationNameResolve({
                        document: query,
                        clientOperationName,
                    });

                    let subscriptionCleanup: (() => void) | null = null;

                    const stream = new ReadableStream({
                        start(controller) {
                            try {
                                const subscription = createSubscriptionStream(controller, query, variables, session, operationName);
                                subscriptionCleanup = subscription.cleanup;
                            } catch (error: unknown) {
                                const message = error instanceof Error ? error.message : String(error);
                                enqueueSafe(controller, sseNext(1, { errors: [{ message }] }));
                                enqueueSafe(controller, sseComplete());
                                closeSafe(controller);
                            }
                        },
                        cancel() {
                            if (subscriptionCleanup) {
                                subscriptionCleanup();
                            }
                        },
                    });

                    return new Response(stream, {
                        headers: {
                            'Content-Type': 'text/event-stream; charset=utf-8',
                            // Disable buffering/proxy transforms to keep SSE flowing in production
                            'Cache-Control': 'no-cache, no-transform',
                            Connection: 'keep-alive',
                            'X-Accel-Buffering': 'no',
                            'Set-Cookie': sessionUtils.createSetSessionCookie(environmentVariables.sessionCookie, session),
                        },
                    });
                } catch (error: any) {
                    return new Response(JSON.stringify({ errors: [{ message: error.message }] }), {
                        status: 500,
                        headers: {
                            'Content-Type': 'application/json',
                            'Set-Cookie': sessionUtils.createSetSessionCookie(environmentVariables.sessionCookie, session),
                        },
                    });
                }
            },
        },
    },
});
