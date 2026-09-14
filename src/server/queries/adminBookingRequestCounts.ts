import { count } from 'drizzle-orm';

import { bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBookingRequestCriterion, GqlSAdminBookingRequestsCountsArgs, GqlSSession } from '../graphql/generated';
import { adminBookingRequestCriterionWhere } from '../utils/adminBookingRequestCriterionWhere';

const ADMIN_COUNTS_CRITERIA_MAX = 20;

async function adminBookingRequestCountOne(criterion: GqlSAdminBookingRequestCriterion, serverRuntime: ServerRuntime): Promise<number> {
    const where = adminBookingRequestCriterionWhere(criterion, serverRuntime.db);
    const [row] = await serverRuntime.db.select({ value: count() }).from(bookingRequests).where(where);
    return row?.value ?? 0;
}

export async function adminBookingRequestCounts(
    args: GqlSAdminBookingRequestsCountsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number[]> {
    try {
        const { criteria } = args;
        if (criteria.length === 0) {
            throw new Error('adminBookingRequestCounts: criteria must not be empty');
        }
        if (criteria.length > ADMIN_COUNTS_CRITERIA_MAX) {
            throw new Error('adminBookingRequestCounts: too many criteria');
        }

        return await Promise.all(criteria.map((criterion) => adminBookingRequestCountOne(criterion, serverRuntime)));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
