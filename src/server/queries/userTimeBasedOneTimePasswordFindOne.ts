import { eq } from 'drizzle-orm';

import { authTimeBasedOneTimePasswords } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAuthTimeBasedOneTimePassword, GqlSSession, GqlSUser } from '../graphql/generated';
import { toGqlAuthTimeBasedOneTimePassword } from '../mappers/toGqlAuthTimeBasedOneTimePassword';

export async function userTimeBasedOneTimePasswordFindOne(
    parentUser: GqlSUser,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAuthTimeBasedOneTimePassword | null> {
    if (!requestingSession.userId || requestingSession.userId !== parentUser.userId) {
        return null;
    }

    const [row] = await serverRuntime.db
        .select()
        .from(authTimeBasedOneTimePasswords)
        .where(eq(authTimeBasedOneTimePasswords.userId, parentUser.userId))
        .limit(1);

    return row ? toGqlAuthTimeBasedOneTimePassword(row) : null;
}
