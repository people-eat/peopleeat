import { and, desc, eq, gte, lt } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { isCallJoinable } from '../../shared/callJoinWindow';
import { bookingRequestOfferCallRooms, bookingRequestOffers, bookingRequests, cookCallSlotBookings, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCallListItem, GqlSSession } from '../graphql/generated';
import { toGqlBookingRequestOfferCallRoom } from '../mappers/toGqlBookingRequestOfferCallRoom';
import { toGqlCookCallSlotBooking } from '../mappers/toGqlCookCallSlotBooking';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60_000;
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60_000;

/**
 * Admin calls hub: LIVE rooms, PENDING slot requests, UPCOMING confirmed slots, RECENT_ROOM / RECENT_SLOT.
 */
export async function adminCallsFindMany(
    _parent: unknown,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminCallListItem[]> {
    try {
        const now = new Date();
        const upcomingUntil = new Date(now.getTime() + SEVEN_DAYS_MS);
        const recentSince = new Date(now.getTime() - FORTY_EIGHT_HOURS_MS);

        const cookUsers = alias(users, 'cookUsers');
        const customerUsers = alias(users, 'customerUsers');

        const liveRooms = await serverRuntime.db
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
            .where(eq(bookingRequestOfferCallRooms.status, 'ACTIVE'))
            .orderBy(desc(bookingRequestOfferCallRooms.startedAt));

        const pendingSlots = await serverRuntime.db
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
            .innerJoin(bookingRequestOffers, eq(bookingRequestOffers.bookingRequestOfferId, cookCallSlotBookings.bookingRequestOfferId))
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .innerJoin(cookUsers, eq(cookUsers.userId, bookingRequestOffers.cookId))
            .innerJoin(customerUsers, eq(customerUsers.userId, bookingRequests.userId))
            .where(and(eq(cookCallSlotBookings.status, 'PENDING'), gte(cookCallSlotBookings.startAt, now)))
            .orderBy(cookCallSlotBookings.startAt);

        const confirmedSlots = await serverRuntime.db
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
            .innerJoin(bookingRequestOffers, eq(bookingRequestOffers.bookingRequestOfferId, cookCallSlotBookings.bookingRequestOfferId))
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .innerJoin(cookUsers, eq(cookUsers.userId, bookingRequestOffers.cookId))
            .innerJoin(customerUsers, eq(customerUsers.userId, bookingRequests.userId))
            .where(eq(cookCallSlotBookings.status, 'CONFIRMED'))
            .orderBy(cookCallSlotBookings.startAt);

        const recentRooms = await serverRuntime.db
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
            .where(and(eq(bookingRequestOfferCallRooms.status, 'ENDED'), gte(bookingRequestOfferCallRooms.endedAt, recentSince)))
            .orderBy(desc(bookingRequestOfferCallRooms.endedAt));

        const recentSlots = await serverRuntime.db
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
            .innerJoin(bookingRequestOffers, eq(bookingRequestOffers.bookingRequestOfferId, cookCallSlotBookings.bookingRequestOfferId))
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .innerJoin(cookUsers, eq(cookUsers.userId, bookingRequestOffers.cookId))
            .innerJoin(customerUsers, eq(customerUsers.userId, bookingRequests.userId))
            .where(
                and(
                    eq(cookCallSlotBookings.status, 'COMPLETED'),
                    gte(cookCallSlotBookings.lastModifiedAt, recentSince),
                    lt(cookCallSlotBookings.endAt, now),
                ),
            )
            .orderBy(desc(cookCallSlotBookings.lastModifiedAt));

        const items: GqlSAdminCallListItem[] = [];

        for (const row of liveRooms) {
            items.push({
                kind: 'LIVE',
                bookingRequestId: row.bookingRequestId,
                bookingRequestOfferId: row.bookingRequestOfferId,
                cookId: row.cookId,
                customerUserId: row.customerUserId,
                cookDisplayName: row.cookDisplayName,
                customerDisplayName: row.customerDisplayName,
                occasion: row.occasion,
                callRoom: toGqlBookingRequestOfferCallRoom(row.room),
                callSlotBooking: null,
            });
        }

        for (const row of pendingSlots) {
            items.push({
                kind: 'PENDING',
                bookingRequestId: row.bookingRequestId,
                bookingRequestOfferId: row.bookingRequestOfferId,
                cookId: row.cookId,
                customerUserId: row.customerUserId,
                cookDisplayName: row.cookDisplayName,
                customerDisplayName: row.customerDisplayName,
                occasion: row.occasion,
                callRoom: null,
                callSlotBooking: toGqlCookCallSlotBooking(row.booking),
            });
        }

        for (const row of confirmedSlots) {
            const inNextSevenDays =
                row.booking.startAt.getTime() >= now.getTime() && row.booking.startAt.getTime() <= upcomingUntil.getTime();
            const joinable = isCallJoinable(row.booking, now);
            if (!inNextSevenDays && !joinable) {
                continue;
            }
            items.push({
                kind: 'UPCOMING',
                bookingRequestId: row.bookingRequestId,
                bookingRequestOfferId: row.bookingRequestOfferId,
                cookId: row.cookId,
                customerUserId: row.customerUserId,
                cookDisplayName: row.cookDisplayName,
                customerDisplayName: row.customerDisplayName,
                occasion: row.occasion,
                callRoom: null,
                callSlotBooking: toGqlCookCallSlotBooking(row.booking),
            });
        }

        for (const row of recentRooms) {
            items.push({
                kind: 'RECENT_ROOM',
                bookingRequestId: row.bookingRequestId,
                bookingRequestOfferId: row.bookingRequestOfferId,
                cookId: row.cookId,
                customerUserId: row.customerUserId,
                cookDisplayName: row.cookDisplayName,
                customerDisplayName: row.customerDisplayName,
                occasion: row.occasion,
                callRoom: toGqlBookingRequestOfferCallRoom(row.room),
                callSlotBooking: null,
            });
        }

        for (const row of recentSlots) {
            items.push({
                kind: 'RECENT_SLOT',
                bookingRequestId: row.bookingRequestId,
                bookingRequestOfferId: row.bookingRequestOfferId,
                cookId: row.cookId,
                customerUserId: row.customerUserId,
                cookDisplayName: row.cookDisplayName,
                customerDisplayName: row.customerDisplayName,
                occasion: row.occasion,
                callRoom: null,
                callSlotBooking: toGqlCookCallSlotBooking(row.booking),
            });
        }

        return items;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
