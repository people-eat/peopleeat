import { asc, desc } from 'drizzle-orm';

import { aiGenerations } from '../db/schema';
import type { GqlSAdminAiGenerationCriterion, GqlSAdminAiGenerationSortField, GqlSSortDirection } from '../graphql/generated';

function adminAiGenerationSortResolve(criterion: Pick<GqlSAdminAiGenerationCriterion, 'sortField' | 'sortDirection'>): {
    sortField: GqlSAdminAiGenerationSortField;
    sortDirection: GqlSSortDirection;
} {
    if (criterion.sortField == null) {
        return { sortField: 'createdAt', sortDirection: 'DESC' };
    }
    return {
        sortField: criterion.sortField,
        sortDirection: criterion.sortDirection === 'ASC' ? 'ASC' : 'DESC',
    };
}

export function adminAiGenerationOrderBy(criterion: Pick<GqlSAdminAiGenerationCriterion, 'sortField' | 'sortDirection'>) {
    const { sortField, sortDirection } = adminAiGenerationSortResolve(criterion);
    const direction = sortDirection === 'ASC' ? asc : desc;

    switch (sortField) {
        case 'kind':
            return direction(aiGenerations.kind);
        case 'modelId':
            return direction(aiGenerations.modelId);
        case 'totalTokens':
            return direction(aiGenerations.totalTokens);
        case 'createdAt':
            return direction(aiGenerations.createdAt);
    }
}
