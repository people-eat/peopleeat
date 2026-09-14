import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminOutboundEmailCreationsArgs, GqlSAdminTimeBucket, GqlSSession } from '../graphql/generated';
import { adminTimeBucketsFindMany } from '../utils/adminTimeBucketsFindMany';

export async function adminOutboundEmailCreationsFindMany(
    args: GqlSAdminOutboundEmailCreationsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminTimeBucket[]> {
    return adminTimeBucketsFindMany('"OutboundEmails"', args.range, args.granularity ?? 'day', requestingSession, serverRuntime);
}
