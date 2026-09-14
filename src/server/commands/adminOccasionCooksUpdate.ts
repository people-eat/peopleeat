import { eq, inArray } from 'drizzle-orm';

import { cooks, occasionCooks, occasions } from '../db/schema';
import type { OccasionCookCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationOccasionCooksUpdateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminOccasionCooksUpdate(
    { adminId }: GqlSAdminMutation,
    { occasionId, cookIds }: GqlSAdminMutationOccasionCooksUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        // Phase 1 — validate + build payloads
        const [occasion] = await serverRuntime.db
            .select({ occasionId: occasions.occasionId })
            .from(occasions)
            .where(eq(occasions.occasionId, occasionId))
            .limit(1);
        if (!occasion) {
            throw new Error('adminOccasionCooksUpdate: occasion not found');
        }

        const uniqueCookIds = [...new Set(cookIds)];
        if (uniqueCookIds.length !== cookIds.length) {
            throw new Error('adminOccasionCooksUpdate: duplicate cook ids');
        }

        if (cookIds.length > 0) {
            const existing = await serverRuntime.db.select({ cookId: cooks.cookId }).from(cooks).where(inArray(cooks.cookId, cookIds));
            if (existing.length !== cookIds.length) {
                throw new Error('adminOccasionCooksUpdate: cook not found');
            }
        }

        const now = new Date();
        const rows: OccasionCookCreate[] = cookIds.map((cookId, position) => ({
            occasionId,
            cookId,
            position,
        }));

        // Phase 2 — replace assignment in a transaction
        await serverRuntime.db.transaction(async (transaction) => {
            await transaction.delete(occasionCooks).where(eq(occasionCooks.occasionId, occasionId));
            if (rows.length > 0) {
                await transaction.insert(occasionCooks).values(rows);
            }
            await transaction.update(occasions).set({ updatedAt: now }).where(eq(occasions.occasionId, occasionId));
        });

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: occasionId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
