import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCallRoomCreationsArgs, GqlSAdminTimeBucket, GqlSSession } from '../graphql/generated';
import { adminTimeBucketsFindMany } from '../utils/adminTimeBucketsFindMany';

export async function adminCallRoomCreationsFindMany(
    args: GqlSAdminCallRoomCreationsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminTimeBucket[]> {
    return adminTimeBucketsFindMany(
        '"BookingRequestOfferCallRooms"',
        args.range,
        args.granularity ?? 'day',
        requestingSession,
        serverRuntime,
        '"startedAt"',
    );
}
