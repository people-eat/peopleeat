import { asc, desc } from 'drizzle-orm';

import { giftCards } from '../db/schema';
import type { GqlSAdminGiftCardCriterion, GqlSAdminGiftCardSortField, GqlSSortDirection } from '../graphql/generated';

function adminGiftCardSortResolve(criterion: Pick<GqlSAdminGiftCardCriterion, 'sortField' | 'sortDirection'>): {
    sortField: GqlSAdminGiftCardSortField;
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

export function adminGiftCardOrderBy(criterion: Pick<GqlSAdminGiftCardCriterion, 'sortField' | 'sortDirection'>) {
    const { sortField, sortDirection } = adminGiftCardSortResolve(criterion);
    const direction = sortDirection === 'ASC' ? asc : desc;

    switch (sortField) {
        case 'originalBalanceCents':
            return direction(giftCards.originalBalanceCents);
        case 'buyerEmail':
            return direction(giftCards.buyerEmail);
        case 'createdAt':
            return direction(giftCards.createdAt);
    }
}
