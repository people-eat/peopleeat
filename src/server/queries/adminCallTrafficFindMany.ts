import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { bookingRequestOfferCallRooms, bookingRequestOffers, bookingRequests, cookCallSlotBookings, users } from '../db/schema';
import type { BookingRequestOfferCallRoom, CookCallSlotBooking } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminCallListItem,
    GqlSAdminCallTrafficArgs,
    GqlSAdminCallTrafficSortField,
    GqlSSession,
    GqlSSortDirection,
} from '../graphql/generated';
import { toGqlBookingRequestOfferCallRoom } from '../mappers/toGqlBookingRequestOfferCallRoom';
import { toGqlCookCallSlotBooking } from '../mappers/toGqlCookCallSlotBooking';
import {
    adminCallTrafficCriterionResolve,
    adminCallTrafficRoomWhere,
    adminCallTrafficSlotWhere,
} from '../utils/adminCallTrafficCriterionWhere';
import { adminCallTrafficKindFromRoomStatus, adminCallTrafficKindFromSlotStatus } from '../utils/adminCallTrafficKinds';
import { findManySkip, findManyTake } from '../utils/findManyTake';

type TrafficRow = {
    item: GqlSAdminCallListItem;
    occurredAt: Date;
    createdAt: Date;
};

function sortTrafficRows(
    rows: TrafficRow[],
    sortField: GqlSAdminCallTrafficSortField | null | undefined,
    sortDirection: GqlSSortDirection | null | undefined,
): TrafficRow[] {
    const field = sortField ?? 'occurredAt';
    const direction = sortDirection === 'ASC' ? 1 : -1;
    return [...rows].sort((a, b) => {
        const aValue = field === 'createdAt' ? a.createdAt.getTime() : a.occurredAt.getTime();
        const bValue = field === 'createdAt' ? b.createdAt.getTime() : b.occurredAt.getTime();
        if (aValue === bValue) return 0;
        return aValue < bValue ? -direction : direction;
    });
}

/**
 * Paginated admin call traffic across rooms + slots (including declines/cancels).
 * Fetches matching rows from both sources, merges, sorts, then applies skip/take.
 */
export async function adminCallTrafficFindMany(
    args: GqlSAdminCallTrafficArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminCallListItem[]> {
    try {
        const { criterion } = args;
        const filter = adminCallTrafficCriterionResolve(criterion);
        const take = findManyTake(criterion.take);
        const skip = findManySkip(criterion.skip);
        const db = serverRuntime.db;

        const cookUsers = alias(users, 'cookUsers');
        const customerUsers = alias(users, 'customerUsers');

        const [roomRows, slotRows] = await Promise.all([
            filter.includeRooms && filter.roomStatuses.length > 0
                ? db
                      .select({
                          room: bookingRequestOfferCallRooms,
                          bookingRequestId: bookingRequests.bookingRequestId,
                          bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId,
                          cookId: bookingRequestOffers.cookId,
                          customerUserId: bookingRequests.userId,
                          cookDisplayName: cookUsers.firstName,
                          customerDisplayName: customerUsers.firstName,
                          occasion: bookingRequests.occasion,
                      })
                      .from(bookingRequestOfferCallRooms)
                      .innerJoin(
                          bookingRequestOffers,
                          eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferCallRooms.bookingRequestOfferId),
                      )
                      .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
                      .innerJoin(cookUsers, eq(cookUsers.userId, bookingRequestOffers.cookId))
                      .innerJoin(customerUsers, eq(customerUsers.userId, bookingRequests.userId))
                      .where(adminCallTrafficRoomWhere(filter, db))
                : Promise.resolve(
                      [] as Array<{
                          room: BookingRequestOfferCallRoom;
                          bookingRequestId: string;
                          bookingRequestOfferId: string;
                          cookId: string;
                          customerUserId: string;
                          cookDisplayName: string;
                          customerDisplayName: string;
                          occasion: string;
                      }>,
                  ),
            filter.includeSlots && filter.slotStatuses.length > 0
                ? db
                      .select({
                          booking: cookCallSlotBookings,
                          bookingRequestId: bookingRequests.bookingRequestId,
                          bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId,
                          cookId: bookingRequestOffers.cookId,
                          customerUserId: bookingRequests.userId,
                          cookDisplayName: cookUsers.firstName,
                          customerDisplayName: customerUsers.firstName,
                          occasion: bookingRequests.occasion,
                      })
                      .from(cookCallSlotBookings)
                      .innerJoin(
                          bookingRequestOffers,
                          eq(bookingRequestOffers.bookingRequestOfferId, cookCallSlotBookings.bookingRequestOfferId),
                      )
                      .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
                      .innerJoin(cookUsers, eq(cookUsers.userId, bookingRequestOffers.cookId))
                      .innerJoin(customerUsers, eq(customerUsers.userId, bookingRequests.userId))
                      .where(adminCallTrafficSlotWhere(filter, db))
                : Promise.resolve(
                      [] as Array<{
                          booking: CookCallSlotBooking;
                          bookingRequestId: string;
                          bookingRequestOfferId: string;
                          cookId: string;
                          customerUserId: string;
                          cookDisplayName: string;
                          customerDisplayName: string;
                          occasion: string;
                      }>,
                  ),
        ]);

        const traffic: TrafficRow[] = [];

        for (const row of roomRows) {
            traffic.push({
                occurredAt: row.room.startedAt,
                createdAt: row.room.startedAt,
                item: {
                    kind: adminCallTrafficKindFromRoomStatus(row.room.status),
                    bookingRequestId: row.bookingRequestId,
                    bookingRequestOfferId: row.bookingRequestOfferId,
                    cookId: row.cookId,
                    customerUserId: row.customerUserId,
                    cookDisplayName: row.cookDisplayName,
                    customerDisplayName: row.customerDisplayName,
                    occasion: row.occasion,
                    callRoom: toGqlBookingRequestOfferCallRoom(row.room),
                    callSlotBooking: null,
                },
            });
        }

        for (const row of slotRows) {
            traffic.push({
                occurredAt: row.booking.startAt,
                createdAt: row.booking.createdAt,
                item: {
                    kind: adminCallTrafficKindFromSlotStatus(row.booking.status),
                    bookingRequestId: row.bookingRequestId,
                    bookingRequestOfferId: row.bookingRequestOfferId,
                    cookId: row.cookId,
                    customerUserId: row.customerUserId,
                    cookDisplayName: row.cookDisplayName,
                    customerDisplayName: row.customerDisplayName,
                    occasion: row.occasion,
                    callRoom: null,
                    callSlotBooking: toGqlCookCallSlotBooking(row.booking),
                },
            });
        }

        return sortTrafficRows(traffic, criterion.sortField, criterion.sortDirection)
            .slice(skip, skip + take)
            .map((row) => row.item);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
