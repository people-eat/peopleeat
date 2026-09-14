import { eq } from 'drizzle-orm';

import { occasions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationOccasionDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminOccasionDelete(
    { adminId }: GqlSAdminMutation,
    { occasionId }: GqlSAdminMutationOccasionDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const deleted = await serverRuntime.db
            .delete(occasions)
            .where(eq(occasions.occasionId, occasionId))
            .returning({ occasionId: occasions.occasionId });
        if (deleted.length === 0) {
            throw new Error('adminOccasionDelete: occasion not found');
        }
        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: occasionId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
