import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminLogCreationsArgs, GqlSAdminTimeBucket, GqlSSession } from '../graphql/generated';
import { adminTimeBucketsFindMany } from '../utils/adminTimeBucketsFindMany';

export async function adminLogCreationsFindMany(
    args: GqlSAdminLogCreationsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminTimeBucket[]> {
    return adminTimeBucketsFindMany('"Logs"', args.range, args.granularity ?? 'day', requestingSession, serverRuntime);
}
