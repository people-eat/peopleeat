import { webPages } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationWebPageUpdateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminWebPageUpdate(
    { adminId }: GqlSAdminMutation,
    { webPageKey, input }: GqlSAdminMutationWebPageUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const titleDe = input.titleDe.trim();
        const descriptionDe = input.descriptionDe.trim();
        if (!titleDe || !descriptionDe) {
            throw new Error('adminWebPageUpdate: titleDe and descriptionDe must not be empty');
        }

        const now = new Date();
        const titleEn = input.titleEn.trim();
        const descriptionEn = input.descriptionEn.trim();

        await serverRuntime.db
            .insert(webPages)
            .values({
                webPageKey,
                titleDe,
                titleEn,
                descriptionDe,
                descriptionEn,
                updatedAt: now,
            })
            .onConflictDoUpdate({
                target: webPages.webPageKey,
                set: {
                    titleDe,
                    titleEn,
                    descriptionDe,
                    descriptionEn,
                    updatedAt: now,
                },
            });

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: webPageKey };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
