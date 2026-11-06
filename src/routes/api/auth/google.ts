import { createFileRoute } from '@tanstack/react-router';

import { authGoogleStart } from '../../../server/commands/authGoogleStart';
import { db } from '../../../server/db';
import { environmentVariables } from '../../../server/env/environmentVariablesCreate';
import { serverRuntimeGet } from '../../../server/graphql/server';
import { loggerCreate } from '../../../server/utils/loggerCreate';
import { sessionUtils } from '../../../server/utils/sessionUtils';

const log = loggerCreate(db);

function redirectResponse(location: string): Response {
    return new Response(null, {
        status: 302,
        headers: { Location: location },
    });
}

export const Route = createFileRoute('/api/auth/google')({
    server: {
        handlers: {
            GET: async ({ request }) => {
                const url = new URL(request.url);
                const sessionId = sessionUtils.getSessionIdFromRequest(environmentVariables.sessionCookie, request);
                try {
                    const result = await authGoogleStart(
                        { sessionId, returnTo: url.searchParams.get('returnTo') ?? undefined },
                        serverRuntimeGet(),
                    );
                    if (result.kind === 'back') {
                        return redirectResponse(result.returnTo);
                    }
                    return redirectResponse(result.authorizationUrl);
                } catch (error) {
                    log.error(error, sessionId ? { sessionId } : undefined);
                    return redirectResponse('/log-on?authError=google');
                }
            },
        },
    },
});
