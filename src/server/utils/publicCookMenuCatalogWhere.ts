import { and, isNotNull, isNull, lte } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { menus } from '../db/schema';

/** Published, non-deleted inventory menu. Completeness and images are applied after hydrate. */
export function publicCookMenuCatalogWhere(now: Date = new Date()): SQL {
    return and(isNull(menus.bookingRequestOfferId), isNotNull(menus.publishedAt), lte(menus.publishedAt, now), isNull(menus.deletedAt))!;
}
