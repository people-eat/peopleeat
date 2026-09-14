import { fileUploadPublicUrl } from '../../shared/contentSection';
import type { Meal } from '../db/schema';
import type { GqlSPublicCookMeal } from '../graphql/generated';

export function toGqlPublicCookMeal(row: Meal): GqlSPublicCookMeal {
    return {
        mealId: row.mealId,
        title: row.title,
        description: row.description,
        imageUrl: row.imageFileUploadId ? fileUploadPublicUrl(row.imageFileUploadId) : null,
        publishedAt: row.publishedAt,
    };
}
