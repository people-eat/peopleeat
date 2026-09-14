import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminTimeBucket, GqlSAdminUserRegistrationsArgs, GqlSSession } from '../graphql/generated';
import { adminTimeBucketsFindMany } from '../utils/adminTimeBucketsFindMany';

export async function adminUserRegistrationsFindMany(
    args: GqlSAdminUserRegistrationsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminTimeBucket[]> {
    return adminTimeBucketsFindMany('"Users"', args.range, args.granularity ?? 'day', requestingSession, serverRuntime);
}
