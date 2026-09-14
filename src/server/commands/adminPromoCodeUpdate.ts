import { eq } from 'drizzle-orm';

import { promoCodes } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationPromoCodeUpdateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminPromoCodeUpdate(
    { adminId }: GqlSAdminMutation,
    { input }: GqlSAdminMutationPromoCodeUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const expiresAt = new Date(input.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
        throw new Error('adminPromoCodeUpdate: expiresAt is invalid');
    }

    try {
        const [existing] = await serverRuntime.db
            .select({ promoCodeId: promoCodes.promoCodeId })
            .from(promoCodes)
            .where(eq(promoCodes.promoCodeId, input.promoCodeId))
            .limit(1);
        if (!existing) {
            throw new Error('adminPromoCodeUpdate: promo code not found');
        }

        await serverRuntime.db.update(promoCodes).set({ expiresAt }).where(eq(promoCodes.promoCodeId, input.promoCodeId));
        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: input.promoCodeId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
