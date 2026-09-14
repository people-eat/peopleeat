import { ilike } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { promoCodes } from '../db/schema';
import type { GqlSAdminPromoCodeCriterion } from '../graphql/generated';
import { likeContainsPattern } from './likeContainsPattern';

/** Shared `WHERE` for `adminPromoCodeFindMany` / `adminPromoCodeCounts`. */
export function adminPromoCodeCriterionWhere(criterion: Pick<GqlSAdminPromoCodeCriterion, 'searchText'>): SQL | undefined {
    const pattern = likeContainsPattern(criterion.searchText);
    return pattern ? ilike(promoCodes.redeemCode, pattern) : undefined;
}
