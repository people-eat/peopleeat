import { sql } from 'drizzle-orm';

import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminGiftCardCreationsArgs, GqlSAdminTimeBucket, GqlSSession } from '../graphql/generated';
import { adminTimeBucketsFindMany } from '../utils/adminTimeBucketsFindMany';

/** Paid gift-card purchases (`PAYED`) over time for the admin overview chart. */
export async function adminGiftCardCreationsFindMany(
    args: GqlSAdminGiftCardCreationsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminTimeBucket[]> {
    return adminTimeBucketsFindMany(
        '"GiftCards"',
        args.range,
        args.granularity ?? 'day',
        requestingSession,
        serverRuntime,
        '"createdAt"',
        sql`"paymentStatus" = 'PAYED'`,
    );
}
