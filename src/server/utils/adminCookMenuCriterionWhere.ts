import { and, asc, desc, ilike, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { menus, users } from '../db/schema';
import type { GqlSAdminCookMenuCriterion } from '../graphql/generated';
import { likeContainsPattern } from './likeContainsPattern';

/** Shared `WHERE` for `adminCookMenuFindMany` / `adminCookMenuCounts` (expects users join). */
export function adminCookMenuCriterionWhere(
    criterion: Pick<GqlSAdminCookMenuCriterion, 'cookIds' | 'searchText' | 'includeDeleted' | 'status'>,
): SQL | undefined {
    const parts: SQL[] = [];

    if (criterion.cookIds && criterion.cookIds.length > 0) {
        parts.push(inArray(menus.cookId, criterion.cookIds));
    }

    if (criterion.status === 'PUBLISHED') {
        parts.push(isNull(menus.deletedAt));
        parts.push(isNotNull(menus.publishedAt));
    } else if (criterion.status === 'DRAFT') {
        parts.push(isNull(menus.deletedAt));
        parts.push(isNull(menus.publishedAt));
    } else if (criterion.status === 'DELETED') {
        parts.push(isNotNull(menus.deletedAt));
    } else if (criterion.includeDeleted === false) {
        parts.push(isNull(menus.deletedAt));
    }

    // Inventory only — offer-scoped menu copies hang off BookingRequestOffers.
    parts.push(isNull(menus.bookingRequestOfferId));

    const pattern = likeContainsPattern(criterion.searchText);
    if (pattern) {
        parts.push(
            or(
                ilike(menus.title, pattern),
                ilike(menus.description, pattern),
                ilike(users.firstName, pattern),
                ilike(users.lastName, pattern),
                ilike(users.emailAddress, pattern),
                ilike(sql`(${users.firstName} || ' ' || ${users.lastName})`, pattern),
            )!,
        );
    }

    if (parts.length === 0) return undefined;
    if (parts.length === 1) return parts[0];
    return and(...parts);
}

export function adminCookMenuOrderBy(criterion: Pick<GqlSAdminCookMenuCriterion, 'sortField' | 'sortDirection'>) {
    const direction = criterion.sortDirection === 'ASC' ? asc : desc;
    switch (criterion.sortField) {
        case 'title':
            return direction(menus.title);
        case 'publishedAt':
            return direction(menus.publishedAt);
        case 'deletedAt':
            return direction(menus.deletedAt);
        case 'createdAt':
        default:
            return direction(menus.createdAt);
    }
}
