import type { Session } from '../db/schema';
import type { GqlSUserSession } from '../graphql/generated';

export function toGqlUserSession(session: Session, currentSessionId: string): GqlSUserSession {
    return {
        sessionId: session.sessionId,
        createdAt: session.createdAt,
        lastInteractionAt: session.lastInteractionAt,
        userAgent: session.userAgent,
        isCurrent: session.sessionId === currentSessionId,
    };
}
