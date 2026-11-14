import { and, eq, ne } from 'drizzle-orm';

import type { CookInviteReward } from '../../shared/cookInviteReward';
import { cookInviteRewardLiveProgramCreate } from '../../shared/cookInviteReward';
import { zNanoId } from '../../shared/idCreate';
import { cooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

export type CookInviteAttribution = {
    invitedByCookId: string;
    inviteReward: CookInviteReward;
};

/**
 * Resolves optional invite attribution for a new cook row.
 * Invalid / missing invites return null so cook create still succeeds.
 */
export async function cookInviteAttributionResolve({
    inviteCookId,
    inviteeUserId,
    inviteeEmailAddress,
    inviteePhoneNumber,
    db,
}: {
    inviteCookId: string | null | undefined;
    inviteeUserId: string;
    inviteeEmailAddress: string | null | undefined;
    inviteePhoneNumber: string | null | undefined;
    db: ServerRuntime['db'];
}): Promise<CookInviteAttribution | null> {
    if (inviteCookId == null || inviteCookId.trim().length === 0) {
        return null;
    }
    const parsed = zNanoId.safeParse(inviteCookId.trim());
    if (!parsed.success) {
        return null;
    }
    const inviterCookId = parsed.data;
    if (inviterCookId === inviteeUserId) {
        return null;
    }

    const [inviter] = await db
        .select({
            cookId: cooks.cookId,
            isApprovedByAdmin: cooks.isApprovedByAdmin,
            emailAddress: users.emailAddress,
            phoneNumber: users.phoneNumber,
        })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(and(eq(cooks.cookId, inviterCookId), ne(cooks.cookId, inviteeUserId)))
        .limit(1);

    if (!inviter || !inviter.isApprovedByAdmin) {
        return null;
    }

    const inviteeEmail = inviteeEmailAddress?.trim().toLowerCase() ?? null;
    const inviterEmail = inviter.emailAddress?.trim().toLowerCase() ?? null;
    if (inviteeEmail != null && inviterEmail != null && inviteeEmail === inviterEmail) {
        return null;
    }

    const inviteePhone = inviteePhoneNumber?.trim() ?? null;
    const inviterPhone = inviter.phoneNumber?.trim() ?? null;
    if (inviteePhone != null && inviterPhone != null && inviteePhone.length > 0 && inviteePhone === inviterPhone) {
        return null;
    }

    return {
        invitedByCookId: inviterCookId,
        inviteReward: cookInviteRewardLiveProgramCreate(),
    };
}
