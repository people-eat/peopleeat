import { eq, inArray } from 'drizzle-orm';

import { cooks, partnerCooks, partners } from '../db/schema';
import type { PartnerCookCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationPartnerCooksUpdateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminPartnerCooksUpdate(
    { adminId }: GqlSAdminMutation,
    { partnerId, cookIds }: GqlSAdminMutationPartnerCooksUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        // Phase 1 — validate + build payloads
        const [partner] = await serverRuntime.db
            .select({ partnerId: partners.partnerId })
            .from(partners)
            .where(eq(partners.partnerId, partnerId))
            .limit(1);
        if (!partner) {
            throw new Error('adminPartnerCooksUpdate: partner not found');
        }

        const uniqueCookIds = [...new Set(cookIds)];
        if (uniqueCookIds.length !== cookIds.length) {
            throw new Error('adminPartnerCooksUpdate: duplicate cook ids');
        }

        if (cookIds.length > 0) {
            const existing = await serverRuntime.db.select({ cookId: cooks.cookId }).from(cooks).where(inArray(cooks.cookId, cookIds));
            if (existing.length !== cookIds.length) {
                throw new Error('adminPartnerCooksUpdate: cook not found');
            }
        }

        const now = new Date();
        const rows: PartnerCookCreate[] = cookIds.map((cookId, position) => ({
            partnerId,
            cookId,
            position,
        }));

        // Phase 2 — replace assignment in a transaction
        await serverRuntime.db.transaction(async (tx) => {
            await tx.delete(partnerCooks).where(eq(partnerCooks.partnerId, partnerId));
            if (rows.length > 0) {
                await tx.insert(partnerCooks).values(rows);
            }
            await tx.update(partners).set({ updatedAt: now }).where(eq(partners.partnerId, partnerId));
        });

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: partnerId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
