import { eq } from 'drizzle-orm';

import { webPages } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminWebPage, GqlSAdminWebPageArgs } from '../graphql/generated';
import { toGqlAdminWebPage, toGqlAdminWebPageGhost } from '../mappers/toGqlAdminWebPage';

export async function adminWebPageFindOne(args: GqlSAdminWebPageArgs, serverRuntime: ServerRuntime): Promise<GqlSAdminWebPage> {
    const [row] = await serverRuntime.db.select().from(webPages).where(eq(webPages.webPageKey, args.webPageKey)).limit(1);
    return row ? toGqlAdminWebPage(row) : toGqlAdminWebPageGhost(args.webPageKey);
}
