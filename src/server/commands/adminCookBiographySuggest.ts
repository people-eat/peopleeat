import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCookBiographySuggestArgs, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { cookBiographySuggestGenerate } from './cookBiographySuggestGenerate';

export async function adminCookBiographySuggest(
    { adminId }: GqlSAdminMutation,
    { cookId, currentBiography }: GqlSAdminMutationCookBiographySuggestArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<string> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const enabled = await featureToggleIsEnabled('COOK_BIOGRAPHY_AI_WRITE', serverRuntime, cookId);
        if (!enabled) {
            throw new Error('adminCookBiographySuggest: COOK_BIOGRAPHY_AI_WRITE is disabled');
        }

        return await cookBiographySuggestGenerate({
            cookId,
            currentBiography,
            requestingSession,
            serverRuntime,
        });
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
