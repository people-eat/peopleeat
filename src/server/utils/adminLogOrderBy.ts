import { asc, desc } from 'drizzle-orm';

import { logs } from '../db/schema';
import type { GqlSAdminLogCriterion, GqlSAdminLogSortField, GqlSSortDirection } from '../graphql/generated';

function adminLogSortResolve(criterion: Pick<GqlSAdminLogCriterion, 'sortField' | 'sortDirection'>): {
    sortField: GqlSAdminLogSortField;
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

export function adminLogOrderBy(criterion: Pick<GqlSAdminLogCriterion, 'sortField' | 'sortDirection'>) {
    const { sortField, sortDirection } = adminLogSortResolve(criterion);
    const direction = sortDirection === 'ASC' ? asc : desc;

    switch (sortField) {
        case 'message':
            return direction(logs.message);
        case 'createdAt':
            return direction(logs.createdAt);
    }
}
