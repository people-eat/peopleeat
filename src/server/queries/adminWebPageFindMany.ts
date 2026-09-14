import { webPageKeys } from '../../shared/webPage';
import { webPages } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminWebPage } from '../graphql/generated';
import { toGqlAdminWebPage, toGqlAdminWebPageGhost } from '../mappers/toGqlAdminWebPage';

export async function adminWebPageFindMany(serverRuntime: ServerRuntime): Promise<GqlSAdminWebPage[]> {
    const rows = await serverRuntime.db.select().from(webPages);
    const byKey = new Map(rows.map((row) => [row.webPageKey, row]));

    return webPageKeys.map((webPageKey) => {
        const row = byKey.get(webPageKey);
        return row ? toGqlAdminWebPage(row) : toGqlAdminWebPageGhost(webPageKey);
    });
}
