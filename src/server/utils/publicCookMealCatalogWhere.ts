import { and, isNotNull, isNull, lte } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { meals } from '../db/schema';

/** Published, non-deleted meal with an image — eligible for the public cook-page catalog. */
export function publicCookMealCatalogWhere(now: Date = new Date()): SQL {
    return and(isNotNull(meals.publishedAt), lte(meals.publishedAt, now), isNull(meals.deletedAt), isNotNull(meals.imageFileUploadId))!;
}
