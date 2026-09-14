import { and, ilike, inArray, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { aiGenerations } from '../db/schema';
import type { GqlSAdminAiGenerationCriterion } from '../graphql/generated';
import { likeContainsPattern } from './likeContainsPattern';

/** Shared `WHERE` for `adminAiGenerationFindMany` / `adminAiGenerationCounts`.
 * Returns `false` when `kinds` is empty (match nothing). */
export function adminAiGenerationCriterionWhere(
    criterion: Pick<GqlSAdminAiGenerationCriterion, 'searchText' | 'kinds'>,
): SQL | undefined | false {
    if (criterion.kinds.length === 0) {
        return false;
    }

    const pattern = likeContainsPattern(criterion.searchText);
    return and(
        inArray(aiGenerations.kind, criterion.kinds),
        pattern
            ? or(ilike(aiGenerations.system, pattern), ilike(aiGenerations.prompt, pattern), ilike(aiGenerations.output, pattern))
            : undefined,
    );
}
