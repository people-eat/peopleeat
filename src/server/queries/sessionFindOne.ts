import { eq } from 'drizzle-orm';

import { sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { toGqlSession } from '../mappers/toGqlSession';

export async function sessionFindOne(requestingSession: GqlSSession, serverRuntime: ServerRuntime): Promise<GqlSSession> {
    const [session] = await serverRuntime.db.select().from(sessions).where(eq(sessions.sessionId, requestingSession.sessionId)).limit(1);
    if (!session) {
        throw new Error('sessionFindOne: session not found');
    }
    return toGqlSession(session);
}
