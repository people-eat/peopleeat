import { createFileRoute } from '@tanstack/react-router';
import { db } from '../../server/db';
import { environmentVariables } from '../../server/env/environmentVariablesCreate';
import { graphqlHttpQueryRun } from '../../server/graphql/server';
import { clientIpFromRequest } from '../../server/utils/clientIpFromRequest';
import { loggerCreate } from '../../server/utils/loggerCreate';
import { sessionUpsert } from '../../server/utils/sessionUpsert';
import { sessionUtils } from '../../server/utils/sessionUtils';

const log = loggerCreate(db);

export const Route = createFileRoute('/api/graphql')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                let sessionCookie = '';
                try {
                    const body = await request.clone().json();
                    const existingSessionId = sessionUtils.getSessionIdFromRequest(environmentVariables.sessionCookie, request);
                    const { body: result, session } = await graphqlHttpQueryRun({
                        query: body.query,
                        variables: body.variables,
                        operationName: typeof body.operationName === 'string' ? body.operationName : undefined,
                        sessionLoad: async () => {
                            return sessionUpsert(
                                db,
                                log,
                                existingSessionId,
                                request.headers.get('user-agent'),
                                clientIpFromRequest(request),
                                request.headers.get('referer'),
                                request.headers.get('x-landing-path'),
                            );
                        },
                    });

                    // Prefer a one-shot cookie override from Sign in as / Return to
                    // admin (`pendingSessionCookieId`); otherwise refresh the
                    // upserted session cookie as usual.
                    const cookieSessionId = session.pendingSessionCookieId ?? session.sessionId;
                    sessionCookie = sessionUtils.createSetSessionCookie(environmentVariables.sessionCookie, {
                        sessionId: cookieSessionId,
                    } as typeof session);

                    return new Response(JSON.stringify(result), {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json',
                            'Set-Cookie': sessionCookie,
                        },
                    });
                } catch (error: unknown) {
                    log.error(error);
                    const message = error instanceof Error ? error.message : 'GraphQL request failed';
                    return new Response(JSON.stringify({ errors: [{ message }] }), {
                        status: 500,
                        headers: {
                            'Content-Type': 'application/json',
                            ...(sessionCookie ? { 'Set-Cookie': sessionCookie } : {}),
                        },
                    });
                }
            },
        },
    },
});
