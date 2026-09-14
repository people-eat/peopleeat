import { and, eq, ilike, inArray, isNotNull, isNull, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { outboundEmails } from '../db/schema';
import type { GqlSAdminOutboundEmailCriterion, GqlSAdminOutboundEmailLifecycleStatus } from '../graphql/generated';
import { likeContainsPattern } from './likeContainsPattern';

function lifecycleStatusClause(status: GqlSAdminOutboundEmailLifecycleStatus): SQL {
    switch (status) {
        case 'FAILED':
            return isNotNull(outboundEmails.failedAt);
        case 'OPENED':
            return isNotNull(outboundEmails.openedAt);
        case 'BOUNCED':
            return isNotNull(outboundEmails.bouncedAt);
        case 'PENDING':
            return and(isNull(outboundEmails.sentAt), isNull(outboundEmails.failedAt))!;
        case 'SENT':
            return and(isNotNull(outboundEmails.sentAt), isNull(outboundEmails.failedAt))!;
    }
}

/** Shared `WHERE` for outbound-email admin list/count. Returns `false` when
 * `purposes` is empty or `lifecycleStatuses` is an empty list (match nothing). */
export function adminOutboundEmailCriterionWhere(
    criterion: Pick<
        GqlSAdminOutboundEmailCriterion,
        'searchText' | 'purposes' | 'userIds' | 'relatedEntityType' | 'relatedEntityId' | 'lifecycleStatuses'
    >,
): SQL | undefined | false {
    if (criterion.purposes.length === 0) {
        return false;
    }

    if (criterion.lifecycleStatuses && criterion.lifecycleStatuses.length === 0) {
        return false;
    }

    const pattern = likeContainsPattern(criterion.searchText);
    const searchClause = pattern ? or(ilike(outboundEmails.toEmail, pattern), ilike(outboundEmails.subject, pattern)) : undefined;

    const lifecycleClause =
        criterion.lifecycleStatuses && criterion.lifecycleStatuses.length > 0
            ? or(...criterion.lifecycleStatuses.map(lifecycleStatusClause))
            : undefined;

    return and(
        inArray(outboundEmails.purpose, criterion.purposes),
        criterion.userIds && criterion.userIds.length > 0 ? inArray(outboundEmails.userId, criterion.userIds) : undefined,
        criterion.relatedEntityType ? eq(outboundEmails.relatedEntityType, criterion.relatedEntityType) : undefined,
        criterion.relatedEntityId ? eq(outboundEmails.relatedEntityId, criterion.relatedEntityId) : undefined,
        searchClause,
        lifecycleClause,
    );
}
