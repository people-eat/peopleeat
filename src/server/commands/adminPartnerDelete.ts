import { eq } from 'drizzle-orm';

import { partners, partnerVenues } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationPartnerDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminPartnerDelete(
    { adminId }: GqlSAdminMutation,
    { partnerId }: GqlSAdminMutationPartnerDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

    try {
        const venues = await serverRuntime.db
            .select({ partnerVenueId: partnerVenues.partnerVenueId })
            .from(partnerVenues)
            .where(eq(partnerVenues.partnerId, partnerId))
            .limit(1);
        if (venues.length > 0) {
            throw new Error('adminPartnerDelete: partner still has venues');
        }

        const deleted = await serverRuntime.db
            .delete(partners)
            .where(eq(partners.partnerId, partnerId))
            .returning({ partnerId: partners.partnerId });
        if (deleted.length === 0) {
            throw new Error('adminPartnerDelete: partner not found');
        }
        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: partnerId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
