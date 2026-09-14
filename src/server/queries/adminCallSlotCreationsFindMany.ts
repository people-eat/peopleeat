import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCallSlotCreationsArgs, GqlSAdminTimeBucket, GqlSSession } from '../graphql/generated';
import { adminTimeBucketsFindMany } from '../utils/adminTimeBucketsFindMany';

export async function adminCallSlotCreationsFindMany(
    args: GqlSAdminCallSlotCreationsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminTimeBucket[]> {
    return adminTimeBucketsFindMany(
        '"CookCallSlotBookings"',
        args.range,
        args.granularity ?? 'day',
        requestingSession,
        serverRuntime,
        '"createdAt"',
    );
}
