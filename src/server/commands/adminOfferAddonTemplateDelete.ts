import { eq } from 'drizzle-orm';

import { offerAddonTemplates } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationOfferAddonTemplateDeleteArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminOfferAddonTemplateDelete(
    { adminId }: GqlSAdminMutation,
    { offerAddonTemplateId }: GqlSAdminMutationOfferAddonTemplateDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

    try {
        const deleted = await serverRuntime.db
            .delete(offerAddonTemplates)
            .where(eq(offerAddonTemplates.offerAddonTemplateId, offerAddonTemplateId))
            .returning({ offerAddonTemplateId: offerAddonTemplates.offerAddonTemplateId });
        if (deleted.length === 0) {
            throw new Error('adminOfferAddonTemplateDelete: template not found');
        }
        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: offerAddonTemplateId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
