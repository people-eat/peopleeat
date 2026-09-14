import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCookBiographySummarySuggestArgs, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { cookBiographySummaryGenerate } from './cookBiographySummaryGenerate';

export async function adminCookBiographySummarySuggest(
    { adminId }: GqlSAdminMutation,
    { cookId, biography }: GqlSAdminMutationCookBiographySummarySuggestArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<string> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const trimmed = biography.trim();
    if (!trimmed) {
        throw new Error('adminCookBiographySummarySuggest: biography is required');
    }

    try {
        const summary = await cookBiographySummaryGenerate({
            cookId,
            biography: trimmed,
            requestingSession,
            serverRuntime,
        });
        if (!summary) {
            throw new Error('adminCookBiographySummarySuggest: generation failed');
        }
        return summary;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
