import { asc, desc } from 'drizzle-orm';

import { sessions, users } from '../db/schema';
import type { GqlSAdminSessionCriterion, GqlSAdminSessionSortField, GqlSSortDirection } from '../graphql/generated';

function adminSessionSortResolve(criterion: Pick<GqlSAdminSessionCriterion, 'sortField' | 'sortDirection'>): {
    sortField: GqlSAdminSessionSortField;
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

export function adminSessionOrderByNeedsUserJoin(criterion: Pick<GqlSAdminSessionCriterion, 'sortField'>) {
    return criterion.sortField === 'user';
}

export function adminSessionOrderBy(criterion: Pick<GqlSAdminSessionCriterion, 'sortField' | 'sortDirection'>) {
    const { sortField, sortDirection } = adminSessionSortResolve(criterion);
    const direction = sortDirection === 'ASC' ? asc : desc;

    switch (sortField) {
        case 'user':
            return direction(users.lastName);
        case 'userAgent':
            return direction(sessions.userAgent);
        case 'lastInteractionAt':
            return direction(sessions.lastInteractionAt);
        case 'createdAt':
            return direction(sessions.createdAt);
    }
}
