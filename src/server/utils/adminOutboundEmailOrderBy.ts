import { asc, desc } from 'drizzle-orm';

import { outboundEmails } from '../db/schema';
import type { GqlSAdminOutboundEmailCriterion, GqlSAdminOutboundEmailSortField, GqlSSortDirection } from '../graphql/generated';

function adminOutboundEmailSortResolve(criterion: Pick<GqlSAdminOutboundEmailCriterion, 'sortField' | 'sortDirection'>): {
    sortField: GqlSAdminOutboundEmailSortField;
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

export function adminOutboundEmailOrderBy(criterion: Pick<GqlSAdminOutboundEmailCriterion, 'sortField' | 'sortDirection'>) {
    const { sortField, sortDirection } = adminOutboundEmailSortResolve(criterion);
    const direction = sortDirection === 'ASC' ? asc : desc;

    switch (sortField) {
        case 'toEmail':
            return direction(outboundEmails.toEmail);
        case 'subject':
            return direction(outboundEmails.subject);
        case 'createdAt':
            return direction(outboundEmails.createdAt);
    }
}
