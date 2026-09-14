import { aiGenerations } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAiGeneration, GqlSAdminAiGenerationsArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminAiGeneration } from '../mappers/toGqlAdminAiGeneration';
import { adminAiGenerationCriterionWhere } from '../utils/adminAiGenerationCriterionWhere';
import { adminAiGenerationOrderBy } from '../utils/adminAiGenerationOrderBy';
import { findManySkip, findManyTake } from '../utils/findManyTake';

export async function adminAiGenerationFindMany(
    args: GqlSAdminAiGenerationsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminAiGeneration[]> {
    try {
        const criterion = args.criterion;
        const where = adminAiGenerationCriterionWhere(criterion);
        if (where === false) {
            return [];
        }

        const rows = await serverRuntime.db
            .select()
            .from(aiGenerations)
            .where(where)
            .orderBy(adminAiGenerationOrderBy(criterion))
            .limit(findManyTake(criterion.take))
            .offset(findManySkip(criterion.skip));

        return rows.map(toGqlAdminAiGeneration);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
