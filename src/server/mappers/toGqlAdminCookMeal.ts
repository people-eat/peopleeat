import { fileUploadPublicUrl } from '../../shared/contentSection';
import type { Meal } from '../db/schema';
import type { GqlSAdminCookMeal } from '../graphql/generated';

export function toGqlAdminCookMeal(row: Meal, cookName: string): GqlSAdminCookMeal {
    return {
        mealId: row.mealId,
        cookId: row.cookId,
        cookName,
        title: row.title,
        description: row.description,
        imageFileUploadId: row.imageFileUploadId,
        imageUrl: row.imageFileUploadId ? fileUploadPublicUrl(row.imageFileUploadId) : null,
        publishedAt: row.publishedAt,
        deletedAt: row.deletedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        // Overridden by `AdminCookMeal.relationships` field resolver when requested.
        relationships: {
            menus: [],
            offers: [],
            deletionBlockedByRelationships: false,
        },
    };
}
