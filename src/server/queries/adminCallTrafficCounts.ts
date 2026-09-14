import { count } from 'drizzle-orm';

import { bookingRequestOfferCallRooms, cookCallSlotBookings } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCallTrafficCountsArgs, GqlSAdminCallTrafficCriterion, GqlSSession } from '../graphql/generated';
import {
    adminCallTrafficCriterionResolve,
    adminCallTrafficRoomWhere,
    adminCallTrafficSlotWhere,
} from '../utils/adminCallTrafficCriterionWhere';

const ADMIN_COUNTS_CRITERIA_MAX = 20;

async function adminCallTrafficCountOne(criterion: GqlSAdminCallTrafficCriterion, serverRuntime: ServerRuntime): Promise<number> {
    const filter = adminCallTrafficCriterionResolve(criterion);
    const db = serverRuntime.db;

    const [roomCount, slotCount] = await Promise.all([
        filter.includeRooms && filter.roomStatuses.length > 0
            ? db
                  .select({ value: count() })
                  .from(bookingRequestOfferCallRooms)
                  .where(adminCallTrafficRoomWhere(filter, db))
                  .then((rows) => rows[0]?.value ?? 0)
            : Promise.resolve(0),
        filter.includeSlots && filter.slotStatuses.length > 0
            ? db
                  .select({ value: count() })
                  .from(cookCallSlotBookings)
                  .where(adminCallTrafficSlotWhere(filter, db))
                  .then((rows) => rows[0]?.value ?? 0)
            : Promise.resolve(0),
    ]);

    return roomCount + slotCount;
}

export async function adminCallTrafficCounts(
    args: GqlSAdminCallTrafficCountsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number[]> {
    try {
        const { criteria } = args;
        if (criteria.length === 0) {
            throw new Error('adminCallTrafficCounts: criteria must not be empty');
        }
        if (criteria.length > ADMIN_COUNTS_CRITERIA_MAX) {
            throw new Error('adminCallTrafficCounts: too many criteria');
        }

        return await Promise.all(criteria.map((criterion) => adminCallTrafficCountOne(criterion, serverRuntime)));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
