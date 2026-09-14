import { eq } from 'drizzle-orm';

import { webPages } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicWebPage, GqlSPublicWebPageQueryFindOneArgs } from '../graphql/generated';
import { toGqlPublicWebPage, toGqlPublicWebPageFromDefaults } from '../mappers/toGqlPublicWebPage';

export async function publicWebPageFindOne(
    args: GqlSPublicWebPageQueryFindOneArgs,
    serverRuntime: ServerRuntime,
): Promise<GqlSPublicWebPage> {
    const [row] = await serverRuntime.db.select().from(webPages).where(eq(webPages.webPageKey, args.webPageKey)).limit(1);
    return row ? toGqlPublicWebPage(row) : toGqlPublicWebPageFromDefaults(args.webPageKey);
}
