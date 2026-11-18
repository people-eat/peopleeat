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
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

    const trimmed = biography.trim();
    if (!trimmed) {
        throw new Error('adminCookBiographySummarySuggest: biography is required');
    }

    try {
        const generated = await cookBiographySummaryGenerate({
            cookId,
            biography: trimmed,
            requestingSession,
            serverRuntime,
        });
        if (!generated) {
            throw new Error('adminCookBiographySummarySuggest: generation failed');
        }
        return generated.biographySummary;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
