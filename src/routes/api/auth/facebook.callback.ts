import { createFileRoute } from '@tanstack/react-router';

import { authFacebookCallback } from '../../../server/commands/authFacebookCallback';
import { db } from '../../../server/db';
import { environmentVariables } from '../../../server/env/environmentVariablesCreate';
import type { GqlSSession } from '../../../server/graphql/generated';
import { serverRuntimeGet } from '../../../server/graphql/server';
import { loggerCreate } from '../../../server/utils/loggerCreate';
import { sessionUtils } from '../../../server/utils/sessionUtils';

const log = loggerCreate(db);

export const Route = createFileRoute('/api/auth/facebook/callback')({
    server: {
        handlers: {
            GET: async ({ request }) => {
                const url = new URL(request.url);
                const cookieSessionId = sessionUtils.getSessionIdFromRequest(environmentVariables.sessionCookie, request);
                try {
                    const result = await authFacebookCallback(
                        {
                            code: url.searchParams.get('code'),
                            state: url.searchParams.get('state'),
                            error: url.searchParams.get('error'),
                            cookieSessionId,
                        },
                        serverRuntimeGet(),
                    );
                    const headers = new Headers({ Location: result.returnTo });
                    if (result.sessionId) {
                        headers.set(
                            'Set-Cookie',
                            sessionUtils.createSetSessionCookie(environmentVariables.sessionCookie, {
                                sessionId: result.sessionId,
                            } as GqlSSession),
                        );
                    }
                    return new Response(null, { status: 302, headers });
                } catch (error) {
                    log.error(error, cookieSessionId ? { sessionId: cookieSessionId } : undefined);
                    return new Response(null, {
                        status: 302,
                        headers: { Location: '/log-on?authError=facebook' },
                    });
                }
            },
        },
    },
});
