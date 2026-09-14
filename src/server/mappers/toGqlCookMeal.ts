import { fileUploadPublicUrl } from '../../shared/contentSection';
import type { Meal } from '../db/schema';
import type { GqlSCookMeal } from '../graphql/generated';

export function toGqlCookMeal(row: Meal): GqlSCookMeal {
    return {
        mealId: row.mealId,
        title: row.title,
        description: row.description,
        imageFileUploadId: row.imageFileUploadId,
        imageUrl: row.imageFileUploadId ? fileUploadPublicUrl(row.imageFileUploadId) : null,
        publishedAt: row.publishedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        // Overridden by `CookMeal.relationships` field resolver when requested.
        relationships: {
            menus: [],
            offers: [],
            deletionBlockedByRelationships: false,
        },
    };
}
