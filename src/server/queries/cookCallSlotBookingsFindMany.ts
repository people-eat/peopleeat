import { and, asc, eq, gte, inArray, lt } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { cookCallSlotBookings, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCook,
    GqlSCookCallSlotBooking,
    GqlSCookCallSlotBookingCriterion,
    GqlSCookCallSlotBookingsArgs,
    GqlSSession,
} from '../graphql/generated';
import { toGqlCookCallSlotBooking } from '../mappers/toGqlCookCallSlotBooking';

const DEFAULT_STATUSES = ['PENDING', 'CONFIRMED'] as const;

export async function cookCallSlotBookingsFindMany(
    { cookId }: GqlSCook,
    args: GqlSCookCallSlotBookingsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookCallSlotBooking[]> {
    try {
        const criterion: GqlSCookCallSlotBookingCriterion | null | undefined = args.criterion;
        const filterStatuses = criterion?.statuses ?? null;
        const useDefaultStatuses = filterStatuses == null || filterStatuses.length === 0;
        const statuses = useDefaultStatuses ? [...DEFAULT_STATUSES] : filterStatuses;
        const from = criterion?.from != null ? new Date(criterion.from) : null;
        const to = criterion?.to != null ? new Date(criterion.to) : null;
        const hasStartAtWindow = from != null || to != null;

        const parts: SQL[] = [eq(cookCallSlotBookings.cookId, cookId), inArray(cookCallSlotBookings.status, statuses)];

        if (from != null) {
            parts.push(gte(cookCallSlotBookings.startAt, from));
        }
        if (to != null) {
            parts.push(lt(cookCallSlotBookings.startAt, to));
        }
        // Preserve legacy “upcoming” filter when statuses are default and no startAt window.
        if (useDefaultStatuses && !hasStartAtWindow) {
            parts.push(gte(cookCallSlotBookings.endAt, new Date()));
        }

        const rows = await serverRuntime.db
            .select({ booking: cookCallSlotBookings, customerFirstName: users.firstName })
            .from(cookCallSlotBookings)
            .innerJoin(users, eq(users.userId, cookCallSlotBookings.userId))
            .where(and(...parts))
            .orderBy(asc(cookCallSlotBookings.startAt));

        return rows.map(({ booking, customerFirstName }) => toGqlCookCallSlotBooking(booking, { display: customerFirstName }));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
