import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBookingRequestCreationsArgs, GqlSAdminTimeBucket, GqlSSession } from '../graphql/generated';
import { adminTimeBucketsFindMany } from '../utils/adminTimeBucketsFindMany';

export async function adminBookingRequestCreationsFindMany(
    args: GqlSAdminBookingRequestCreationsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminTimeBucket[]> {
    return adminTimeBucketsFindMany('"BookingRequests"', args.range, args.granularity ?? 'day', requestingSession, serverRuntime);
}
