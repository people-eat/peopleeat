import { and, asc, eq, inArray } from 'drizzle-orm';

import { bookingRequestOffers, cookInviteRewards, cooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

export type CookInviteeProgress = {
    cookId: string;
    display: string;
    registered: boolean;
    approved: boolean;
    firstOfferCreated: boolean;
    firstEvent: boolean;
    rewardUnlocked: boolean;
};

export async function cookInviteesFindMany(db: ServerRuntime['db'], inviterCookId: string): Promise<CookInviteeProgress[]> {
    const invitees = await db
        .select({
            cookId: cooks.cookId,
            isApprovedByAdmin: cooks.isApprovedByAdmin,
            stageName: cooks.stageName,
            firstName: users.firstName,
            createdAt: cooks.createdAt,
        })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(eq(cooks.invitedByCookId, inviterCookId))
        .orderBy(asc(cooks.createdAt));

    if (invitees.length === 0) {
        return [];
    }

    const inviteeIds = invitees.map((row) => row.cookId);

    const offerCookIds = await db
        .selectDistinct({ cookId: bookingRequestOffers.cookId })
        .from(bookingRequestOffers)
        .where(inArray(bookingRequestOffers.cookId, inviteeIds));
    const offerSet = new Set(offerCookIds.map((row) => row.cookId));

    const eventCookIds = await db
        .selectDistinct({ cookId: bookingRequestOffers.cookId })
        .from(bookingRequestOffers)
        .where(
            and(
                inArray(bookingRequestOffers.cookId, inviteeIds),
                eq(bookingRequestOffers.userAccepted, true),
                eq(bookingRequestOffers.cookAccepted, true),
                eq(bookingRequestOffers.paymentStatus, 'PAYED'),
            ),
        );
    const eventSet = new Set(eventCookIds.map((row) => row.cookId));

    const unlocked = await db
        .select({ fromInviteeCookId: cookInviteRewards.fromInviteeCookId })
        .from(cookInviteRewards)
        .where(inArray(cookInviteRewards.fromInviteeCookId, inviteeIds));
    const unlockedSet = new Set(unlocked.map((row) => row.fromInviteeCookId));

    return invitees.map((row) => ({
        cookId: row.cookId,
        display: (row.stageName?.trim() || row.firstName).trim(),
        registered: true,
        approved: row.isApprovedByAdmin,
        firstOfferCreated: offerSet.has(row.cookId),
        firstEvent: eventSet.has(row.cookId),
        rewardUnlocked: unlockedSet.has(row.cookId),
    }));
}

export async function cookInviteOpenFeeCreditRemainingCount(db: ServerRuntime['db'], inviterCookId: string): Promise<number> {
    const rows = await db
        .select({ consumption: cookInviteRewards.consumption })
        .from(cookInviteRewards)
        .where(and(eq(cookInviteRewards.cookId, inviterCookId), eq(cookInviteRewards.status, 'OPEN')));

    let remaining = 0;
    for (const row of rows) {
        if (row.consumption.kind === 'COOK_PLATFORM_FEE_BOOKINGS') {
            remaining += row.consumption.remainingBookingCount;
        }
    }
    return remaining;
}
