import { eq } from 'drizzle-orm';

import { cities } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCityDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminCityDelete(
    { adminId }: GqlSAdminMutation,
    { cityId }: GqlSAdminMutationCityDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const deleted = await serverRuntime.db.delete(cities).where(eq(cities.cityId, cityId)).returning({ cityId: cities.cityId });
        if (deleted.length === 0) {
            throw new Error('adminCityDelete: city not found');
        }
        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: cityId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
