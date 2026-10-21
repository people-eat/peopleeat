import { asc, count, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { bookingRequestOffers, bookingRequests, cooks, supportRequests, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCookPayoutBlockedReason } from '../graphql/generated';
import { adminBookingRequestCriterionWhere } from '../utils/adminBookingRequestCriterionWhere';
import { adminBookingRequestOfferCriterionWhere } from '../utils/adminBookingRequestOfferCriterionWhere';
import { adminSupportRequestCriterionWhere } from '../utils/adminSupportRequestCriterionWhere';
import { adminUserCriterionWhere } from '../utils/adminUserCriterionWhere';
import { bookingRequestOfferCookPayoutReadinessResolve } from '../utils/bookingRequestOfferCookPayoutReadinessResolve';
import { findManyTake } from '../utils/findManyTake';

const ADMIN_ACTION_ITEMS_LIST_TAKE = 5;
const cookUsers = alias(users, 'CookUsers');

type AdminActionItemsPendingCook = {
    userId: string;
    displayName: string;
    emailAddress: string | null;
    createdAt: Date;
};

type AdminActionItemsBlockedBookingRequest = {
    bookingRequestId: string;
    occasion: string;
    customerName: string;
    dateTime: Date;
    city: string;
};

type AdminActionItemsDuePayoutOffer = {
    bookingRequestId: string;
    bookingRequestOfferId: string;
    cookName: string;
    payoutCentsCook: number;
    plannedPayoutDateTime: Date | null;
    cookPayoutReady: boolean;
    cookPayoutBlockedReason: GqlSAdminCookPayoutBlockedReason | null;
};

type AdminActionItemsOpenSupportRequest = {
    supportRequestId: string;
    subject: string;
    customerName: string;
    createdAt: Date;
    adminUnreadNotificationCount: number;
};

type AdminActionItemsPendingOfferChatReview = {
    bookingRequestId: string;
    bookingRequestOfferId: string;
    occasion: string;
    customerName: string;
    cookName: string;
    adminChatReviewPendingCount: number;
};

type AdminActionItemsQueue<TItem> = {
    count: number;
    items: TItem[];
};

export type AdminActionItemsSnapshot = {
    pendingCooks: AdminActionItemsQueue<AdminActionItemsPendingCook>;
    blockedBookingRequests: AdminActionItemsQueue<AdminActionItemsBlockedBookingRequest>;
    duePayoutOffers: AdminActionItemsQueue<AdminActionItemsDuePayoutOffer>;
    openSupportRequests: AdminActionItemsQueue<AdminActionItemsOpenSupportRequest>;
    pendingOfferChatReviews: AdminActionItemsQueue<AdminActionItemsPendingOfferChatReview>;
};

function displayName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName}`.trim();
}

/**
 * Snapshot of admin-home action queues for Slack digests (and future weekly briefs).
 * Same filters as `/admin` overview; not GraphQL — no admin session required.
 */
export async function adminActionItemsSnapshot(
    serverRuntime: ServerRuntime,
    options?: { now?: Date; take?: number },
): Promise<AdminActionItemsSnapshot> {
    const now = options?.now ?? new Date();
    const take = findManyTake(options?.take ?? ADMIN_ACTION_ITEMS_LIST_TAKE);

    const pendingCookCriterion = {
        skip: 0,
        take,
        types: ['cook' as const],
        isApprovedByAdmin: false,
    };
    const blockedBookingCriterion = {
        skip: 0,
        take,
        publicationStatuses: ['PUBLICATION_BLOCKED_BY_ADMIN_REVIEW' as const],
    };
    const duePayoutCriterion = {
        skip: 0,
        take,
        paymentStatuses: ['PAYED' as const],
        plannedPayoutDateTimeTo: now,
    };
    const openSupportCriterion = {
        skip: 0,
        take,
        statuses: ['OPEN' as const],
    };
    const pendingOfferChatReviewCriterion = {
        skip: 0,
        take,
        hasAdminChatReviewPending: true as const,
    };

    const pendingCookWhere = adminUserCriterionWhere(pendingCookCriterion, serverRuntime.db);
    const blockedBookingWhere = adminBookingRequestCriterionWhere(blockedBookingCriterion, serverRuntime.db);
    const duePayoutWhere = adminBookingRequestOfferCriterionWhere(duePayoutCriterion);
    const openSupportWhere = adminSupportRequestCriterionWhere(openSupportCriterion, serverRuntime.db);
    const pendingOfferChatReviewWhere = adminBookingRequestOfferCriterionWhere(pendingOfferChatReviewCriterion);

    const [
        pendingCookCountRow,
        pendingCookRows,
        blockedCountRow,
        blockedRows,
        duePayoutCountRow,
        duePayoutRows,
        openSupportCountRow,
        openSupportRows,
        pendingOfferChatReviewCountRow,
        pendingOfferChatReviewRows,
    ] = await Promise.all([
        pendingCookWhere === false
            ? Promise.resolve([{ value: 0 }])
            : serverRuntime.db.select({ value: count() }).from(users).where(pendingCookWhere),
        pendingCookWhere === false
            ? Promise.resolve([])
            : serverRuntime.db
                  .select({
                      userId: users.userId,
                      firstName: users.firstName,
                      lastName: users.lastName,
                      emailAddress: users.emailAddress,
                      createdAt: users.createdAt,
                  })
                  .from(users)
                  .where(pendingCookWhere)
                  .orderBy(desc(users.createdAt))
                  .limit(take),
        serverRuntime.db.select({ value: count() }).from(bookingRequests).where(blockedBookingWhere),
        serverRuntime.db
            .select({
                bookingRequest: bookingRequests,
                firstName: users.firstName,
                lastName: users.lastName,
            })
            .from(bookingRequests)
            .innerJoin(users, eq(users.userId, bookingRequests.userId))
            .where(blockedBookingWhere)
            .orderBy(desc(bookingRequests.createdAt))
            .limit(take),
        serverRuntime.db.select({ value: count() }).from(bookingRequestOffers).where(duePayoutWhere),
        serverRuntime.db
            .select({
                offer: bookingRequestOffers,
                cookFirstName: users.firstName,
                cookLastName: users.lastName,
                stripeAccountId: cooks.stripeAccountId,
                stripeAccountActive: cooks.stripeAccountActive,
            })
            .from(bookingRequestOffers)
            .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
            .innerJoin(users, eq(users.userId, cooks.cookId))
            .where(duePayoutWhere)
            .orderBy(asc(bookingRequestOffers.plannedPayoutDateTime))
            .limit(take),
        serverRuntime.db.select({ value: count() }).from(supportRequests).where(openSupportWhere),
        serverRuntime.db
            .select({
                supportRequest: supportRequests,
                firstName: users.firstName,
                lastName: users.lastName,
            })
            .from(supportRequests)
            .innerJoin(users, eq(users.userId, supportRequests.userId))
            .where(openSupportWhere)
            .orderBy(desc(sql`${supportRequests.adminUnreadNotificationCount} > 0`), desc(supportRequests.createdAt))
            .limit(take),
        serverRuntime.db.select({ value: count() }).from(bookingRequestOffers).where(pendingOfferChatReviewWhere),
        serverRuntime.db
            .select({
                offer: bookingRequestOffers,
                bookingRequest: bookingRequests,
                customerFirstName: users.firstName,
                customerLastName: users.lastName,
                cookFirstName: cookUsers.firstName,
                cookLastName: cookUsers.lastName,
            })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .innerJoin(users, eq(users.userId, bookingRequests.userId))
            .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
            .innerJoin(cookUsers, eq(cookUsers.userId, cooks.cookId))
            .where(pendingOfferChatReviewWhere)
            .orderBy(sql`${bookingRequestOffers.adminChatReviewedAt} ASC NULLS FIRST`, asc(bookingRequestOffers.createdAt))
            .limit(take),
    ]);

    const duePayoutItems: AdminActionItemsDuePayoutOffer[] = await Promise.all(
        duePayoutRows.map(async (row) => {
            const readiness = await bookingRequestOfferCookPayoutReadinessResolve(
                { stripeAccountId: row.stripeAccountId, stripeAccountActive: row.stripeAccountActive },
                serverRuntime.stripe,
            );
            return {
                bookingRequestId: row.offer.bookingRequestId,
                bookingRequestOfferId: row.offer.bookingRequestOfferId,
                cookName: displayName(row.cookFirstName, row.cookLastName),
                payoutCentsCook: row.offer.payoutCentsCook,
                plannedPayoutDateTime: row.offer.plannedPayoutDateTime,
                cookPayoutReady: readiness.cookPayoutReady,
                cookPayoutBlockedReason: readiness.cookPayoutBlockedReason,
            };
        }),
    );

    return {
        pendingCooks: {
            count: pendingCookCountRow[0]?.value ?? 0,
            items: pendingCookRows.map((row) => ({
                userId: row.userId,
                displayName: displayName(row.firstName, row.lastName),
                emailAddress: row.emailAddress,
                createdAt: row.createdAt,
            })),
        },
        blockedBookingRequests: {
            count: blockedCountRow[0]?.value ?? 0,
            items: blockedRows.map((row) => {
                const city =
                    row.bookingRequest.exactEventAddress.city.trim().length > 0
                        ? row.bookingRequest.exactEventAddress.city
                        : row.bookingRequest.exactEventAddress.displayText;
                return {
                    bookingRequestId: row.bookingRequest.bookingRequestId,
                    occasion: row.bookingRequest.occasion,
                    customerName: displayName(row.firstName, row.lastName),
                    dateTime: row.bookingRequest.dateTime,
                    city,
                };
            }),
        },
        duePayoutOffers: {
            count: duePayoutCountRow[0]?.value ?? 0,
            items: duePayoutItems,
        },
        openSupportRequests: {
            count: openSupportCountRow[0]?.value ?? 0,
            items: openSupportRows.map((row) => ({
                supportRequestId: row.supportRequest.supportRequestId,
                subject: row.supportRequest.subject,
                customerName: displayName(row.firstName, row.lastName),
                createdAt: row.supportRequest.createdAt,
                adminUnreadNotificationCount: row.supportRequest.adminUnreadNotificationCount,
            })),
        },
        pendingOfferChatReviews: {
            count: pendingOfferChatReviewCountRow[0]?.value ?? 0,
            items: pendingOfferChatReviewRows.map((row) => ({
                bookingRequestId: row.offer.bookingRequestId,
                bookingRequestOfferId: row.offer.bookingRequestOfferId,
                occasion: row.bookingRequest.occasion,
                customerName: displayName(row.customerFirstName, row.customerLastName),
                cookName: displayName(row.cookFirstName, row.cookLastName),
                adminChatReviewPendingCount: row.offer.adminChatReviewPendingCount,
            })),
        },
    };
}
