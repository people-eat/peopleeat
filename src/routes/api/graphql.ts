import { createFileRoute } from '@tanstack/react-router';
import { db } from '../../server/db';
import { environmentVariables } from '../../server/env/environmentVariablesCreate';
import { executeGraphQLQuery } from '../../server/graphql/server';
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
                    sessionCookie = sessionUtils.createSetSessionCookie(environmentVariables.sessionCookie, session);

                    const body = await request.clone().json();
                    const result = await executeGraphQLQuery(body.query, body.variables, session);

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
