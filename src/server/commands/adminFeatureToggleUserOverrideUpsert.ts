import { eq } from 'drizzle-orm';

import { featureToggleUserOverrides, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationFeatureToggleUserOverrideUpsertArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminFeatureToggleUserOverrideUpsert(
    { adminId }: GqlSAdminMutation,
    { userId, featureToggleKey, enabled }: GqlSAdminMutationFeatureToggleUserOverrideUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const trimmedUserId = userId.trim();
    if (trimmedUserId.length === 0) {
        throw new Error('adminFeatureToggleUserOverrideUpsert: userId must not be empty');
    }

    try {
        const [user] = await serverRuntime.db.select({ userId: users.userId }).from(users).where(eq(users.userId, trimmedUserId)).limit(1);
        if (!user) {
            throw new Error('adminFeatureToggleUserOverrideUpsert: user not found');
        }

        const now = new Date();
        await serverRuntime.db
            .insert(featureToggleUserOverrides)
            .values({
                userId: trimmedUserId,
                featureToggleKey,
                enabled,
                createdAt: now,
                updatedAt: now,
            })
            .onConflictDoUpdate({
                target: [featureToggleUserOverrides.userId, featureToggleUserOverrides.featureToggleKey],
                set: {
                    enabled,
                    updatedAt: now,
                },
            });

        await Promise.all([serverRuntime.publish.adminUpdates(), serverRuntime.publish.userUpdates({ userId: trimmedUserId })]);
        return { success: true, referenceId: trimmedUserId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
