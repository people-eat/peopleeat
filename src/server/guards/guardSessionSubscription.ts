import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';

export function guardSessionSubscription(requestingSession: GqlSSession, serverRuntime: ServerRuntime): AsyncIterableIterator<any> {
    return serverRuntime.subscribe.to(`session-updates:${requestingSession.sessionId}`);
}
