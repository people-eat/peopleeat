import { count } from 'drizzle-orm';

import { aiGenerations } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAiGenerationCountsArgs, GqlSAdminAiGenerationCriterion, GqlSSession } from '../graphql/generated';
import { adminAiGenerationCriterionWhere } from '../utils/adminAiGenerationCriterionWhere';

const ADMIN_COUNTS_CRITERIA_MAX = 20;

async function adminAiGenerationCountOne(criterion: GqlSAdminAiGenerationCriterion, serverRuntime: ServerRuntime): Promise<number> {
    const where = adminAiGenerationCriterionWhere(criterion);
    if (where === false) {
        return 0;
    }

    const [row] = await serverRuntime.db.select({ value: count() }).from(aiGenerations).where(where);
    return row?.value ?? 0;
}

export async function adminAiGenerationCounts(
    args: GqlSAdminAiGenerationCountsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number[]> {
    try {
        const { criteria } = args;
        if (criteria.length === 0) {
            throw new Error('adminAiGenerationCounts: criteria must not be empty');
        }
        if (criteria.length > ADMIN_COUNTS_CRITERIA_MAX) {
            throw new Error('adminAiGenerationCounts: too many criteria');
        }

        return await Promise.all(criteria.map((criterion) => adminAiGenerationCountOne(criterion, serverRuntime)));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
