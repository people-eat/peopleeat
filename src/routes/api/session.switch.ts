import { createFileRoute } from '@tanstack/react-router';
import { eq } from 'drizzle-orm';

import { db } from '../../server/db';
import { sessions } from '../../server/db/schema';
import { environmentVariables } from '../../server/env/environmentVariablesCreate';
import type { GqlSSession } from '../../server/graphql/generated';
import { loggerCreate } from '../../server/utils/loggerCreate';
import { sessionUtils } from '../../server/utils/sessionUtils';
import { zNanoId } from '../../shared/idCreate';

const log = loggerCreate(db);

/**
 * Cookie-swap redirect for admin Sign in as / Return to admin.
 *
 * Mutation `Set-Cookie` + `window.location.assign` races in some browsers
 * (cookie not stored before the next document request), so the client lands
 * still on the previous session. This endpoint sets the cookie and redirects
 * in the same response so the browser applies the cookie before navigation.
 *
 * Allowed switches:
 * - current cookie session is the impersonation return session of `toSessionId`
 *   (admin → impersonation)
 * - current cookie session's `impersonationReturnSessionId` equals `toSessionId`
 *   (impersonation → admin; current may already be soft-terminated)
 * - cookie already equals `toSessionId` (idempotent)
 */
function redirectPathNormalize(raw: string | null): string {
    if (!raw) return '/';
    let path: string;
    try {
        path = decodeURIComponent(raw);
    } catch {
        return '/';
    }
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || path.includes('\n') || path.includes('\r')) {
        return '/';
    }
    return path;
}

export const Route = createFileRoute('/api/session/switch')({
    server: {
        handlers: {
            GET: async ({ request }) => {
                const url = new URL(request.url);
                const toSessionIdRaw = url.searchParams.get('toSessionId');
                const redirectPath = redirectPathNormalize(url.searchParams.get('redirect'));

                const parsedTo = zNanoId.safeParse(toSessionIdRaw);
                if (!parsedTo.success) {
                    return new Response('Invalid session', { status: 400 });
                }
                const toSessionId = parsedTo.data;

                const currentSessionId = sessionUtils.getSessionIdFromRequest(environmentVariables.sessionCookie, request);
                if (!currentSessionId) {
                    return new Response('No session', { status: 401 });
                }

                try {
                    const [toSession] = await db
                        .select({
                            sessionId: sessions.sessionId,
                            impersonationReturnSessionId: sessions.impersonationReturnSessionId,
                            wasTerminatedAt: sessions.wasTerminatedAt,
                        })
                        .from(sessions)
                        .where(eq(sessions.sessionId, toSessionId))
                        .limit(1);

                    if (!toSession) {
                        return new Response('Session not found', { status: 404 });
                    }

                    // Idempotent: already on the target cookie.
                    if (currentSessionId === toSessionId) {
                        if (toSession.wasTerminatedAt != null) {
                            return new Response('Session terminated', { status: 409 });
                        }
                        return new Response(null, {
                            status: 302,
                            headers: {
                                Location: redirectPath,
                                'Set-Cookie': sessionUtils.createSetSessionCookie(environmentVariables.sessionCookie, {
                                    sessionId: toSessionId,
                                } as GqlSSession),
                            },
                        });
                    }

                    const [currentSession] = await db
                        .select({
                            sessionId: sessions.sessionId,
                            impersonationReturnSessionId: sessions.impersonationReturnSessionId,
                        })
                        .from(sessions)
                        .where(eq(sessions.sessionId, currentSessionId))
                        .limit(1);

                    if (!currentSession) {
                        return new Response('Current session not found', { status: 401 });
                    }

                    const adminToImpersonation = toSession.impersonationReturnSessionId === currentSessionId;
                    const impersonationToAdmin = currentSession.impersonationReturnSessionId === toSessionId;

                    if (!adminToImpersonation && !impersonationToAdmin) {
                        log.warn(`sessionSwitch denied current=${currentSessionId} to=${toSessionId}`, {
                            sessionId: currentSessionId,
                        });
                        return new Response('Forbidden', { status: 403 });
                    }

                    if (adminToImpersonation && toSession.wasTerminatedAt != null) {
                        return new Response('Impersonation session terminated', { status: 409 });
                    }

                    if (impersonationToAdmin && toSession.wasTerminatedAt != null) {
                        return new Response('Return session terminated', { status: 409 });
                    }

                    return new Response(null, {
                        status: 302,
                        headers: {
                            Location: redirectPath,
                            'Set-Cookie': sessionUtils.createSetSessionCookie(environmentVariables.sessionCookie, {
                                sessionId: toSessionId,
                            } as GqlSSession),
                        },
                    });
                } catch (error) {
                    log.error(error, currentSessionId ? ({ sessionId: currentSessionId } as GqlSSession) : undefined);
                    return new Response('Session switch failed', { status: 500 });
                }
            },
        },
    },
});
