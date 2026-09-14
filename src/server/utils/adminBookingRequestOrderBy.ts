import { asc, desc } from 'drizzle-orm';

import { bookingRequests } from '../db/schema';
import type { GqlSAdminBookingRequestCriterion, GqlSAdminBookingRequestSortField, GqlSSortDirection } from '../graphql/generated';

function adminBookingRequestSortResolve(criterion: Pick<GqlSAdminBookingRequestCriterion, 'sortField' | 'sortDirection'>): {
    sortField: GqlSAdminBookingRequestSortField;
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

export function adminBookingRequestOrderBy(criterion: Pick<GqlSAdminBookingRequestCriterion, 'sortField' | 'sortDirection'>) {
    const { sortField, sortDirection } = adminBookingRequestSortResolve(criterion);
    const direction = sortDirection === 'ASC' ? asc : desc;

    switch (sortField) {
        case 'dateTime':
            return direction(bookingRequests.dateTime);
        case 'occasion':
            return direction(bookingRequests.occasion);
        case 'createdAt':
            return direction(bookingRequests.createdAt);
    }
}
