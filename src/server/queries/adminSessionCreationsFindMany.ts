import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminSessionCreationsArgs, GqlSAdminTimeBucket, GqlSSession } from '../graphql/generated';
import { adminTimeBucketsFindMany } from '../utils/adminTimeBucketsFindMany';

export async function adminSessionCreationsFindMany(
    args: GqlSAdminSessionCreationsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminTimeBucket[]> {
    return adminTimeBucketsFindMany('"Sessions"', args.range, args.granularity ?? 'day', requestingSession, serverRuntime);
}
