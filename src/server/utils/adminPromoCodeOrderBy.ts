import { asc, desc } from 'drizzle-orm';

import { promoCodes } from '../db/schema';
import type { GqlSAdminPromoCodeCriterion, GqlSAdminPromoCodeSortField, GqlSSortDirection } from '../graphql/generated';

function adminPromoCodeSortResolve(criterion: Pick<GqlSAdminPromoCodeCriterion, 'sortField' | 'sortDirection'>): {
    sortField: GqlSAdminPromoCodeSortField;
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

export function adminPromoCodeOrderBy(criterion: Pick<GqlSAdminPromoCodeCriterion, 'sortField' | 'sortDirection'>) {
    const { sortField, sortDirection } = adminPromoCodeSortResolve(criterion);
    const direction = sortDirection === 'ASC' ? asc : desc;

    switch (sortField) {
        case 'expiresAt':
            return direction(promoCodes.expiresAt);
        case 'amountCents':
            return direction(promoCodes.amountCents);
        case 'redeemCode':
            return direction(promoCodes.redeemCode);
        case 'createdAt':
            return direction(promoCodes.createdAt);
    }
}
