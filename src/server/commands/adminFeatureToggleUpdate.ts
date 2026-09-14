import { featureToggles } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationFeatureToggleUpdateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminFeatureToggleUpdate(
    { adminId }: GqlSAdminMutation,
    { featureToggleKey, enabled }: GqlSAdminMutationFeatureToggleUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const now = new Date();
        await serverRuntime.db
            .insert(featureToggles)
            .values({
                featureToggleKey,
                enabled,
                createdAt: now,
                updatedAt: now,
            })
            .onConflictDoUpdate({
                target: featureToggles.featureToggleKey,
                set: {
                    enabled,
                    updatedAt: now,
                },
            });

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: featureToggleKey };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
