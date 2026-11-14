import { and, asc, eq, sql } from 'drizzle-orm';

import {
    COOK_INVITE_STACK_MAX_REMAINING_BOOKINGS,
    cookInviteConsumptionFromBenefit,
    cookInviteMilestoneFromUnlockKind,
    cookInviteRewardParse,
} from '../../shared/cookInviteReward';
import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, cookInviteRewards, cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

async function inviteeHasFirstOffer(db: ServerRuntime['db'], inviteeCookId: string): Promise<boolean> {
    const [row] = await db
        .select({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId })
        .from(bookingRequestOffers)
        .where(eq(bookingRequestOffers.cookId, inviteeCookId))
        .limit(1);
    return row != null;
}

async function inviteeHasFirstEvent(db: ServerRuntime['db'], inviteeCookId: string): Promise<boolean> {
    const [row] = await db
        .select({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId })
        .from(bookingRequestOffers)
        .where(
            and(
                eq(bookingRequestOffers.cookId, inviteeCookId),
                eq(bookingRequestOffers.userAccepted, true),
                eq(bookingRequestOffers.cookAccepted, true),
                eq(bookingRequestOffers.paymentStatus, 'PAYED'),
            ),
        )
        .limit(1);
    return row != null;
}

async function openFeeCreditRemainingSum(db: ServerRuntime['db'], inviterCookId: string): Promise<number> {
    const rows = await db
        .select({ consumption: cookInviteRewards.consumption })
        .from(cookInviteRewards)
        .where(and(eq(cookInviteRewards.cookId, inviterCookId), eq(cookInviteRewards.status, 'OPEN')));

    let remaining = 0;
    for (const row of rows) {
        const consumption = row.consumption;
        if (consumption.kind === 'COOK_PLATFORM_FEE_BOOKINGS') {
            remaining += consumption.remainingBookingCount;
        }
    }
    return remaining;
}

/**
 * Idempotent mint of an inviter reward when the invitee’s frozen unlock milestone is met.
 * Not gated by COOK_INVITE (toggle only hides the cook-profile entry point).
 */
export async function cookInviteRewardUnlock(
    serverRuntime: ServerRuntime,
    { inviteeCookId }: { inviteeCookId: string },
): Promise<{ minted: boolean }> {
    const [invitee] = await serverRuntime.db.select().from(cooks).where(eq(cooks.cookId, inviteeCookId)).limit(1);
    if (!invitee?.invitedByCookId || invitee.inviteReward == null) {
        return { minted: false };
    }

    const terms = cookInviteRewardParse(invitee.inviteReward);
    if (!terms) {
        serverRuntime.log.error(new Error(`cookInviteRewardUnlock: invalid inviteReward on cook ${inviteeCookId}`));
        return { minted: false };
    }

    const milestone = cookInviteMilestoneFromUnlockKind(terms.unlockKind);
    if (milestone === 'approved' && !invitee.isApprovedByAdmin) {
        return { minted: false };
    }
    if (milestone === 'firstOfferCreated') {
        if (!(await inviteeHasFirstOffer(serverRuntime.db, inviteeCookId))) {
            return { minted: false };
        }
    }
    if (milestone === 'firstEvent') {
        if (!(await inviteeHasFirstEvent(serverRuntime.db, inviteeCookId))) {
            return { minted: false };
        }
    }

    const [existing] = await serverRuntime.db
        .select({ cookInviteRewardId: cookInviteRewards.cookInviteRewardId })
        .from(cookInviteRewards)
        .where(eq(cookInviteRewards.fromInviteeCookId, inviteeCookId))
        .limit(1);
    if (existing) {
        return { minted: false };
    }

    if (terms.benefit.kind === 'COOK_PLATFORM_FEE_BOOKINGS') {
        const openRemaining = await openFeeCreditRemainingSum(serverRuntime.db, invitee.invitedByCookId);
        if (openRemaining + terms.benefit.bookingCount > COOK_INVITE_STACK_MAX_REMAINING_BOOKINGS) {
            return { minted: false };
        }
    }

    const consumption = cookInviteConsumptionFromBenefit(terms.benefit);
    const cookInviteRewardId = idCreate();
    try {
        await serverRuntime.db.insert(cookInviteRewards).values({
            cookInviteRewardId,
            cookId: invitee.invitedByCookId,
            fromInviteeCookId: inviteeCookId,
            terms,
            consumption,
            status: 'OPEN',
        });
    } catch (error) {
        // Unique on fromInviteeCookId — concurrent unlocks are fine.
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('CookInviteRewards_fromInviteeCookId_uidx') || message.includes('unique')) {
            return { minted: false };
        }
        throw error;
    }

    await serverRuntime.publish.userUpdates({ userId: invitee.invitedByCookId });
    return { minted: true };
}

/** Best-effort unlock after an invitee’s offer becomes PAYED. */
export async function cookInviteRewardUnlockAfterInviteePaid(
    serverRuntime: ServerRuntime,
    { inviteeCookId }: { inviteeCookId: string },
): Promise<void> {
    try {
        await cookInviteRewardUnlock(serverRuntime, { inviteeCookId });
    } catch (error) {
        serverRuntime.log.error(error);
    }
}

/** Pick oldest OPEN fee-booking credit with remaining > 0. */
export async function cookInviteOpenFeeCreditFindOne(
    db: ServerRuntime['db'],
    inviterCookId: string,
): Promise<{ cookInviteRewardId: string; platformFeePercentCook: number } | null> {
    const rows = await db
        .select({
            cookInviteRewardId: cookInviteRewards.cookInviteRewardId,
            terms: cookInviteRewards.terms,
            consumption: cookInviteRewards.consumption,
        })
        .from(cookInviteRewards)
        .where(and(eq(cookInviteRewards.cookId, inviterCookId), eq(cookInviteRewards.status, 'OPEN')))
        .orderBy(asc(cookInviteRewards.createdAt));

    for (const row of rows) {
        if (row.terms.benefit.kind !== 'COOK_PLATFORM_FEE_BOOKINGS') continue;
        if (row.consumption.kind !== 'COOK_PLATFORM_FEE_BOOKINGS') continue;
        if (row.consumption.remainingBookingCount <= 0) continue;
        return {
            cookInviteRewardId: row.cookInviteRewardId,
            platformFeePercentCook: row.terms.benefit.platformFeePercentCook,
        };
    }
    return null;
}

/** Decrement remaining on a stamped offer becoming PAYED. */
export async function cookInviteRewardConsume(
    db: ServerRuntime['db'],
    { cookInviteRewardId }: { cookInviteRewardId: string },
): Promise<void> {
    const [row] = await db.select().from(cookInviteRewards).where(eq(cookInviteRewards.cookInviteRewardId, cookInviteRewardId)).limit(1);
    if (!row || row.status !== 'OPEN') {
        return;
    }
    if (row.consumption.kind !== 'COOK_PLATFORM_FEE_BOOKINGS') {
        return;
    }
    const remaining = Math.max(0, row.consumption.remainingBookingCount - 1);
    await db
        .update(cookInviteRewards)
        .set({
            consumption: { kind: 'COOK_PLATFORM_FEE_BOOKINGS', remainingBookingCount: remaining },
            status: remaining === 0 ? 'EXHAUSTED' : 'OPEN',
            lastModifiedAt: sql`now()`,
        })
        .where(and(eq(cookInviteRewards.cookInviteRewardId, cookInviteRewardId), eq(cookInviteRewards.status, 'OPEN')));
}
