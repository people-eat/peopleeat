import { eq } from 'drizzle-orm';

import { cookieSettings } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSSessionCookieSetting } from '../graphql/generated';
import { toGqlSessionCookieSetting } from '../mappers/toGqlSessionCookieSetting';

export async function sessionCookieSettingFindOne(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSSessionCookieSetting | null> {
    const [row] = await serverRuntime.db
        .select()
        .from(cookieSettings)
        .where(eq(cookieSettings.sessionId, requestingSession.sessionId))
        .limit(1);

    return row ? toGqlSessionCookieSetting(row) : null;
}
