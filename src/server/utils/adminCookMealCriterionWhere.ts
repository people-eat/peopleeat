import { and, asc, desc, ilike, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { meals, users } from '../db/schema';
import type { GqlSAdminCookMealCriterion } from '../graphql/generated';
import { likeContainsPattern } from './likeContainsPattern';

/** Shared `WHERE` for `adminCookMealFindMany` / `adminCookMealCounts` (expects users join). */
export function adminCookMealCriterionWhere(
    criterion: Pick<GqlSAdminCookMealCriterion, 'cookIds' | 'mealIds' | 'searchText' | 'includeDeleted' | 'status' | 'imageFilter'>,
): SQL | undefined {
    const parts: SQL[] = [];

    if (criterion.cookIds && criterion.cookIds.length > 0) {
        parts.push(inArray(meals.cookId, criterion.cookIds));
    }

    if (criterion.mealIds && criterion.mealIds.length > 0) {
        parts.push(inArray(meals.mealId, criterion.mealIds));
    }

    if (criterion.status === 'PUBLISHED') {
        parts.push(isNull(meals.deletedAt));
        parts.push(isNotNull(meals.publishedAt));
    } else if (criterion.status === 'DRAFT') {
        parts.push(isNull(meals.deletedAt));
        parts.push(isNull(meals.publishedAt));
    } else if (criterion.status === 'DELETED') {
        parts.push(isNotNull(meals.deletedAt));
    } else if (criterion.includeDeleted === false) {
        parts.push(isNull(meals.deletedAt));
    }

    if (criterion.imageFilter === 'WITH_IMAGE') {
        parts.push(isNotNull(meals.imageFileUploadId));
    } else if (criterion.imageFilter === 'WITHOUT_IMAGE') {
        parts.push(isNull(meals.imageFileUploadId));
    } else if (criterion.imageFilter === 'ON_PUBLIC_PAGE') {
        parts.push(isNotNull(meals.publishedAt));
        parts.push(isNull(meals.deletedAt));
        parts.push(isNotNull(meals.imageFileUploadId));
    } else if (criterion.imageFilter === 'NOT_ON_PUBLIC_PAGE') {
        parts.push(isNotNull(meals.publishedAt));
        parts.push(isNull(meals.deletedAt));
        parts.push(isNull(meals.imageFileUploadId));
    }

    const pattern = likeContainsPattern(criterion.searchText);
    if (pattern) {
        parts.push(
            or(
                ilike(meals.title, pattern),
                ilike(meals.description, pattern),
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

export function adminCookMealOrderBy(criterion: Pick<GqlSAdminCookMealCriterion, 'sortField' | 'sortDirection'>) {
    const direction = criterion.sortDirection === 'ASC' ? asc : desc;
    switch (criterion.sortField) {
        case 'title':
            return direction(meals.title);
        case 'publishedAt':
            return direction(meals.publishedAt);
        case 'deletedAt':
            return direction(meals.deletedAt);
        case 'createdAt':
        default:
            return direction(meals.createdAt);
    }
}
