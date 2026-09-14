import { and, eq } from 'drizzle-orm';

import { featureToggleUserOverrides, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationFeatureToggleUserOverrideDeleteArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminFeatureToggleUserOverrideDelete(
    { adminId }: GqlSAdminMutation,
    { userId, featureToggleKey }: GqlSAdminMutationFeatureToggleUserOverrideDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const trimmedUserId = userId.trim();
    if (trimmedUserId.length === 0) {
        throw new Error('adminFeatureToggleUserOverrideDelete: userId must not be empty');
    }

    try {
        const [user] = await serverRuntime.db.select({ userId: users.userId }).from(users).where(eq(users.userId, trimmedUserId)).limit(1);
        if (!user) {
            throw new Error('adminFeatureToggleUserOverrideDelete: user not found');
        }

        await serverRuntime.db
            .delete(featureToggleUserOverrides)
            .where(
                and(
                    eq(featureToggleUserOverrides.userId, trimmedUserId),
                    eq(featureToggleUserOverrides.featureToggleKey, featureToggleKey),
                ),
            );

        await Promise.all([serverRuntime.publish.adminUpdates(), serverRuntime.publish.userUpdates({ userId: trimmedUserId })]);
        return { success: true, referenceId: trimmedUserId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
