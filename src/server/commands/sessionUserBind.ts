import { eq } from 'drizzle-orm';

import { sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';

export async function sessionUserBind(
    sessionId: string,
    userId: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<void> {
    await serverRuntime.db.update(sessions).set({ userId }).where(eq(sessions.sessionId, sessionId));
    requestingSession.userId = userId;
    await serverRuntime.publish.sessionUpdates({ sessionId });
}
