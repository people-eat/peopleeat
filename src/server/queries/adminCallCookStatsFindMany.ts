import { and, count, eq, gte, lte, sql } from 'drizzle-orm';

import { bookingRequestOfferCallRooms, bookingRequestOffers, cookCallSlotBookings, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCallCookStat, GqlSAdminCallCookStatsArgs, GqlSAdminCallCookStatSortField, GqlSSession } from '../graphql/generated';
import { dateTimeRangeNormalize } from '../utils/dateTimeRangeNormalize';
import { findManyTake } from '../utils/findManyTake';

type CookStatAccumulator = {
    cookId: string;
    displayName: string;
    roomCount: number;
    completedSlotCount: number;
    declinedCount: number;
    canceledCount: number;
    pendingAwaitingCookCount: number;
};

function sortValue(stat: CookStatAccumulator, sortBy: GqlSAdminCallCookStatSortField): number {
    switch (sortBy) {
        case 'roomCount':
            return stat.roomCount;
        case 'completedSlotCount':
            return stat.completedSlotCount;
        case 'declinedCount':
            return stat.declinedCount;
        case 'pendingAwaitingCookCount':
            return stat.pendingAwaitingCookCount;
    }
}

/**
 * Top cooks by call activity in range. Rooms keyed by startedAt; terminal slot
 * outcomes by lastModifiedAt; pending-awaiting-cook is current (not range-scoped).
 */
export async function adminCallCookStatsFindMany(
    args: GqlSAdminCallCookStatsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminCallCookStat[]> {
    try {
        const { startDateTime, endDateTime } = dateTimeRangeNormalize(args.range);
        const sortBy = args.sortBy ?? 'roomCount';
        const take = findManyTake(args.take);
        const db = serverRuntime.db;
        const byCook = new Map<string, CookStatAccumulator>();

        function ensure(cookId: string, displayName: string): CookStatAccumulator {
            const existing = byCook.get(cookId);
            if (existing) return existing;
            const created: CookStatAccumulator = {
                cookId,
                displayName,
                roomCount: 0,
                completedSlotCount: 0,
                declinedCount: 0,
                canceledCount: 0,
                pendingAwaitingCookCount: 0,
            };
            byCook.set(cookId, created);
            return created;
        }

        const [roomRows, slotOutcomeRows, pendingRows] = await Promise.all([
            db
                .select({
                    cookId: bookingRequestOffers.cookId,
                    displayName: users.firstName,
                    value: count(),
                })
                .from(bookingRequestOfferCallRooms)
                .innerJoin(
                    bookingRequestOffers,
                    eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferCallRooms.bookingRequestOfferId),
                )
                .innerJoin(users, eq(users.userId, bookingRequestOffers.cookId))
                .where(
                    and(
                        gte(bookingRequestOfferCallRooms.startedAt, startDateTime),
                        lte(bookingRequestOfferCallRooms.startedAt, endDateTime),
                    ),
                )
                .groupBy(bookingRequestOffers.cookId, users.firstName),
            db
                .select({
                    cookId: cookCallSlotBookings.cookId,
                    displayName: users.firstName,
                    status: cookCallSlotBookings.status,
                    value: count(),
                })
                .from(cookCallSlotBookings)
                .innerJoin(users, eq(users.userId, cookCallSlotBookings.cookId))
                .where(
                    and(
                        sql`${cookCallSlotBookings.status} IN ('COMPLETED', 'DECLINED', 'CANCELED')`,
                        gte(cookCallSlotBookings.lastModifiedAt, startDateTime),
                        lte(cookCallSlotBookings.lastModifiedAt, endDateTime),
                    ),
                )
                .groupBy(cookCallSlotBookings.cookId, users.firstName, cookCallSlotBookings.status),
            db
                .select({
                    cookId: cookCallSlotBookings.cookId,
                    displayName: users.firstName,
                    value: count(),
                })
                .from(cookCallSlotBookings)
                .innerJoin(users, eq(users.userId, cookCallSlotBookings.cookId))
                .where(and(eq(cookCallSlotBookings.status, 'PENDING'), eq(cookCallSlotBookings.initiator, 'CUSTOMER')))
                .groupBy(cookCallSlotBookings.cookId, users.firstName),
        ]);

        for (const row of roomRows) {
            ensure(row.cookId, row.displayName).roomCount = row.value;
        }
        for (const row of slotOutcomeRows) {
            const stat = ensure(row.cookId, row.displayName);
            if (row.status === 'COMPLETED') stat.completedSlotCount = row.value;
            else if (row.status === 'DECLINED') stat.declinedCount = row.value;
            else if (row.status === 'CANCELED') stat.canceledCount = row.value;
        }
        for (const row of pendingRows) {
            ensure(row.cookId, row.displayName).pendingAwaitingCookCount = row.value;
        }

        return [...byCook.values()]
            .filter(
                (stat) =>
                    stat.roomCount > 0 ||
                    stat.completedSlotCount > 0 ||
                    stat.declinedCount > 0 ||
                    stat.canceledCount > 0 ||
                    stat.pendingAwaitingCookCount > 0,
            )
            .sort((a, b) => {
                const diff = sortValue(b, sortBy) - sortValue(a, sortBy);
                if (diff !== 0) return diff;
                return a.displayName.localeCompare(b.displayName);
            })
            .slice(0, take);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
