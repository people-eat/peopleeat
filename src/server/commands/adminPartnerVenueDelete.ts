import { eq } from 'drizzle-orm';

import { partnerVenues } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationPartnerVenueDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminPartnerVenueDelete(
    { adminId }: GqlSAdminMutation,
    { partnerVenueId }: GqlSAdminMutationPartnerVenueDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

    try {
        const deleted = await serverRuntime.db
            .delete(partnerVenues)
            .where(eq(partnerVenues.partnerVenueId, partnerVenueId))
            .returning({ partnerVenueId: partnerVenues.partnerVenueId });
        if (deleted.length === 0) {
            throw new Error('adminPartnerVenueDelete: partner venue not found');
        }
        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: partnerVenueId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
