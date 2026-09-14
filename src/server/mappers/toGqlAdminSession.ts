import type { Session } from '../db/schema';
import type { GqlSAdminSession } from '../graphql/generated';

export function toGqlAdminSession(session: Session): GqlSAdminSession {
    return {
        sessionId: session.sessionId,
        userId: session.userId,
        lastInteractionAt: session.lastInteractionAt,
        wasTerminatedAt: session.wasTerminatedAt,
        connectionActive: session.connectionActive,
        userAgent: session.userAgent,
        ipHash: session.ipHash,
        referrer: session.referrer,
        landingPath: session.landingPath,
        isBot: session.isBot,
        createdAt: session.createdAt,

        // resolved fields
        user: null,
    };
}
