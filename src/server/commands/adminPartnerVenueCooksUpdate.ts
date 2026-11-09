import { eq, inArray } from 'drizzle-orm';

import { cooks, partnerVenueCooks, partnerVenues } from '../db/schema';
import type { PartnerVenueCookCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationPartnerVenueCooksUpdateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminPartnerVenueCooksUpdate(
    { adminId }: GqlSAdminMutation,
    { partnerVenueId, cookIds }: GqlSAdminMutationPartnerVenueCooksUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

    try {
        const [venue] = await serverRuntime.db
            .select({ partnerVenueId: partnerVenues.partnerVenueId })
            .from(partnerVenues)
            .where(eq(partnerVenues.partnerVenueId, partnerVenueId))
            .limit(1);
        if (!venue) {
            throw new Error('adminPartnerVenueCooksUpdate: partner venue not found');
        }

        const uniqueCookIds = [...new Set(cookIds)];
        if (uniqueCookIds.length !== cookIds.length) {
            throw new Error('adminPartnerVenueCooksUpdate: duplicate cook ids');
        }

        if (cookIds.length > 0) {
            const existing = await serverRuntime.db.select({ cookId: cooks.cookId }).from(cooks).where(inArray(cooks.cookId, cookIds));
            if (existing.length !== cookIds.length) {
                throw new Error('adminPartnerVenueCooksUpdate: cook not found');
            }
        }

        const now = new Date();
        const rows: PartnerVenueCookCreate[] = cookIds.map((cookId, position) => ({
            partnerVenueId,
            cookId,
            position,
        }));

        await serverRuntime.db.transaction(async (tx) => {
            await tx.delete(partnerVenueCooks).where(eq(partnerVenueCooks.partnerVenueId, partnerVenueId));
            if (rows.length > 0) {
                await tx.insert(partnerVenueCooks).values(rows);
            }
            await tx.update(partnerVenues).set({ updatedAt: now }).where(eq(partnerVenues.partnerVenueId, partnerVenueId));
        });

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: partnerVenueId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
