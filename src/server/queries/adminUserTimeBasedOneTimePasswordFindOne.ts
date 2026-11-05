import { eq } from 'drizzle-orm';

import { authTimeBasedOneTimePasswords } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminUser, GqlSAuthTimeBasedOneTimePassword } from '../graphql/generated';
import { toGqlAuthTimeBasedOneTimePassword } from '../mappers/toGqlAuthTimeBasedOneTimePassword';

export async function adminUserTimeBasedOneTimePasswordFindOne(
    parent: Pick<GqlSAdminUser, 'userId'>,
    serverRuntime: ServerRuntime,
): Promise<GqlSAuthTimeBasedOneTimePassword | null> {
    const [row] = await serverRuntime.db
        .select()
        .from(authTimeBasedOneTimePasswords)
        .where(eq(authTimeBasedOneTimePasswords.userId, parent.userId))
        .limit(1);

    return row ? toGqlAuthTimeBasedOneTimePassword(row) : null;
}
