import { and, eq, exists, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { bookingRequestOfferCallRooms, bookingRequestOffers, bookingRequests, cookCallSlotBookings, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCallTrafficCriterion } from '../graphql/generated';
import {
    adminCallTrafficIncludesRooms,
    adminCallTrafficIncludesSlots,
    adminCallTrafficKindsResolve,
    adminCallTrafficRoomStatuses,
    adminCallTrafficSlotStatuses,
} from './adminCallTrafficKinds';
import { dateTimeRangeNormalize } from './dateTimeRangeNormalize';
import { likeContainsPattern } from './likeContainsPattern';

export type AdminCallTrafficCriterionFilter = Pick<
    GqlSAdminCallTrafficCriterion,
    'searchText' | 'kinds' | 'initiators' | 'cookIds' | 'userIds' | 'range'
>;

export type AdminCallTrafficResolvedFilter = {
    kinds: ReturnType<typeof adminCallTrafficKindsResolve>;
    includeRooms: boolean;
    includeSlots: boolean;
    roomStatuses: Array<'ACTIVE' | 'ENDED'>;
    slotStatuses: ReturnType<typeof adminCallTrafficSlotStatuses>;
    initiators: NonNullable<GqlSAdminCallTrafficCriterion['initiators']> | null;
    cookIds: string[] | null;
    userIds: string[] | null;
    range: { startDateTime: Date; endDateTime: Date } | null;
    searchPattern: string | null;
};

export function adminCallTrafficCriterionResolve(criterion: AdminCallTrafficCriterionFilter): AdminCallTrafficResolvedFilter {
    const kinds = adminCallTrafficKindsResolve(criterion.kinds);
    const initiators = criterion.initiators && criterion.initiators.length > 0 ? criterion.initiators : null;
    const includeRooms = adminCallTrafficIncludesRooms(kinds) && initiators == null;
    const includeSlots = adminCallTrafficIncludesSlots(kinds);

    return {
        kinds,
        includeRooms,
        includeSlots,
        roomStatuses: adminCallTrafficRoomStatuses(kinds),
        slotStatuses: adminCallTrafficSlotStatuses(kinds),
        initiators,
        cookIds: criterion.cookIds && criterion.cookIds.length > 0 ? criterion.cookIds : null,
        userIds: criterion.userIds && criterion.userIds.length > 0 ? criterion.userIds : null,
        range: criterion.range ? dateTimeRangeNormalize(criterion.range) : null,
        searchPattern: likeContainsPattern(criterion.searchText),
    };
}

/** Shared `WHERE` for room-side traffic queries. */
export function adminCallTrafficRoomWhere(filter: AdminCallTrafficResolvedFilter, db: ServerRuntime['db']): SQL {
    if (!filter.includeRooms || filter.roomStatuses.length === 0) {
        return sql`false`;
    }

    const parts: SQL[] = [inArray(bookingRequestOfferCallRooms.status, filter.roomStatuses)];

    if (filter.range) {
        parts.push(gte(bookingRequestOfferCallRooms.startedAt, filter.range.startDateTime));
        parts.push(lte(bookingRequestOfferCallRooms.startedAt, filter.range.endDateTime));
    }

    if (filter.cookIds || filter.userIds || filter.searchPattern) {
        const cookUsers = alias(users, 'callTrafficRoomCookUsers');
        const customerUsers = alias(users, 'callTrafficRoomCustomerUsers');
        const offerParts: SQL[] = [eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferCallRooms.bookingRequestOfferId)];
        if (filter.cookIds) {
            offerParts.push(inArray(bookingRequestOffers.cookId, filter.cookIds));
        }
        if (filter.userIds) {
            offerParts.push(inArray(bookingRequests.userId, filter.userIds));
        }
        if (filter.searchPattern) {
            offerParts.push(
                or(
                    ilike(bookingRequests.occasion, filter.searchPattern),
                    ilike(customerUsers.emailAddress, filter.searchPattern),
                    ilike(customerUsers.firstName, filter.searchPattern),
                    ilike(customerUsers.lastName, filter.searchPattern),
                    ilike(cookUsers.emailAddress, filter.searchPattern),
                    ilike(cookUsers.firstName, filter.searchPattern),
                    ilike(cookUsers.lastName, filter.searchPattern),
                )!,
            );
        }

        parts.push(
            exists(
                db
                    .select({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId })
                    .from(bookingRequestOffers)
                    .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
                    .innerJoin(cookUsers, eq(cookUsers.userId, bookingRequestOffers.cookId))
                    .innerJoin(customerUsers, eq(customerUsers.userId, bookingRequests.userId))
                    .where(and(...offerParts)),
            ),
        );
    }

    return and(...parts)!;
}

/** Shared `WHERE` for slot-side traffic queries. */
export function adminCallTrafficSlotWhere(filter: AdminCallTrafficResolvedFilter, db: ServerRuntime['db']): SQL {
    if (!filter.includeSlots || filter.slotStatuses.length === 0) {
        return sql`false`;
    }

    const parts: SQL[] = [inArray(cookCallSlotBookings.status, filter.slotStatuses)];

    if (filter.initiators) {
        parts.push(inArray(cookCallSlotBookings.initiator, filter.initiators));
    }

    if (filter.range) {
        parts.push(gte(cookCallSlotBookings.startAt, filter.range.startDateTime));
        parts.push(lte(cookCallSlotBookings.startAt, filter.range.endDateTime));
    }

    if (filter.cookIds) {
        parts.push(inArray(cookCallSlotBookings.cookId, filter.cookIds));
    }

    if (filter.userIds) {
        parts.push(inArray(cookCallSlotBookings.userId, filter.userIds));
    }

    if (filter.searchPattern) {
        const cookUsers = alias(users, 'callTrafficSlotCookUsers');
        const customerUsers = alias(users, 'callTrafficSlotCustomerUsers');
        parts.push(
            or(
                exists(
                    db
                        .select({ bookingRequestId: bookingRequests.bookingRequestId })
                        .from(bookingRequests)
                        .innerJoin(bookingRequestOffers, eq(bookingRequestOffers.bookingRequestId, bookingRequests.bookingRequestId))
                        .where(
                            and(
                                eq(bookingRequestOffers.bookingRequestOfferId, cookCallSlotBookings.bookingRequestOfferId),
                                ilike(bookingRequests.occasion, filter.searchPattern),
                            ),
                        ),
                ),
                exists(
                    db
                        .select({ userId: customerUsers.userId })
                        .from(customerUsers)
                        .where(
                            and(
                                eq(customerUsers.userId, cookCallSlotBookings.userId),
                                or(
                                    ilike(customerUsers.emailAddress, filter.searchPattern),
                                    ilike(customerUsers.firstName, filter.searchPattern),
                                    ilike(customerUsers.lastName, filter.searchPattern),
                                ),
                            ),
                        ),
                ),
                exists(
                    db
                        .select({ userId: cookUsers.userId })
                        .from(cookUsers)
                        .where(
                            and(
                                eq(cookUsers.userId, cookCallSlotBookings.cookId),
                                or(
                                    ilike(cookUsers.emailAddress, filter.searchPattern),
                                    ilike(cookUsers.firstName, filter.searchPattern),
                                    ilike(cookUsers.lastName, filter.searchPattern),
                                ),
                            ),
                        ),
                ),
            )!,
        );
    }

    return and(...parts)!;
}
