import { and, ilike, inArray, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { giftCards } from '../db/schema';
import type { GqlSAdminGiftCardCriterion } from '../graphql/generated';
import { likeContainsPattern } from './likeContainsPattern';

/** Shared `WHERE` for `adminGiftCardFindMany` / `adminGiftCardCounts`. Returns
 * `false` when `paymentStatuses` is empty (match nothing). */
export function adminGiftCardCriterionWhere(
    criterion: Pick<GqlSAdminGiftCardCriterion, 'searchText' | 'paymentStatuses'>,
): SQL | undefined | false {
    if (criterion.paymentStatuses.length === 0) {
        return false;
    }

    const pattern = likeContainsPattern(criterion.searchText);
    const searchClause = pattern
        ? or(
              ilike(giftCards.buyerEmail, pattern),
              ilike(giftCards.recipientName, pattern),
              ilike(giftCards.redeemCode, pattern),
              ilike(giftCards.occasion, pattern),
          )
        : undefined;

    return and(inArray(giftCards.paymentStatus, criterion.paymentStatuses), searchClause);
}
