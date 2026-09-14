import { asc, desc } from 'drizzle-orm';

import { users } from '../db/schema';
import type { GqlSAdminUserCriterion, GqlSAdminUserSortField, GqlSSortDirection } from '../graphql/generated';

export function adminUserSortResolve(criterion: Pick<GqlSAdminUserCriterion, 'sortField' | 'sortDirection'>): {
    sortField: GqlSAdminUserSortField;
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

export function adminUserOrderBy(criterion: Pick<GqlSAdminUserCriterion, 'sortField' | 'sortDirection'>) {
    const { sortField, sortDirection } = adminUserSortResolve(criterion);
    const direction = sortDirection === 'ASC' ? asc : desc;

    switch (sortField) {
        case 'firstName':
            return direction(users.firstName);
        case 'lastName':
            return direction(users.lastName);
        case 'emailAddress':
            return direction(users.emailAddress);
        case 'createdAt':
            return direction(users.createdAt);
    }
}
