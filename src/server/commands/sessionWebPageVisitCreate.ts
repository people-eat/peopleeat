import { eq } from 'drizzle-orm';

import { sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { SessionEventWebPageVisitedPayload } from '../domain/sessionEvent';
import type { GqlSMutationResult, GqlSMutationSessionWebPageVisitCreateArgs, GqlSSession } from '../graphql/generated';
import { sessionEventCreate } from '../utils/sessionEventCreate';

export async function sessionWebPageVisitCreate(
    args: GqlSMutationSessionWebPageVisitCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const [session] = await serverRuntime.db
            .select({ wasTerminatedAt: sessions.wasTerminatedAt })
            .from(sessions)
            .where(eq(sessions.sessionId, requestingSession.sessionId))
            .limit(1);

        if (!session || session.wasTerminatedAt != null) {
            return { success: true, referenceId: null };
        }

        const input = args.input;
        const params: NonNullable<SessionEventWebPageVisitedPayload['params']> = {};
        if (input.cityId) params.cityId = input.cityId;
        if (input.cookId) params.cookId = input.cookId;
        if (input.blogPostId) params.blogPostId = input.blogPostId;
        if (input.partnerId) params.partnerId = input.partnerId;
        if (input.occasionId) params.occasionId = input.occasionId;
        if (input.bookingRequestId) params.bookingRequestId = input.bookingRequestId;

        const payload: SessionEventWebPageVisitedPayload = {
            webPageKey: input.webPageKey,
            ...(input.path ? { path: input.path.slice(0, 512) } : {}),
            ...(Object.keys(params).length > 0 ? { params } : {}),
        };

        const { sessionEventId } = await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'WEB_PAGE_VISITED',
            payload,
        });

        return { success: true, referenceId: sessionEventId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
