import { and, asc, desc, eq, exists, sql } from 'drizzle-orm';

import type { Database } from '../db';
import type { Cook } from '../db/schema';
import { bookingRequestOffers, cooks, customerTestimonials, users } from '../db/schema';
import type { GqlSPublicCookFindManyCriterion } from '../graphql/generated';
import { publicCookFindManySearchWhere, publicCookListedWhere } from './publicCookFindManyCriterionWhere';

/** True when the cook has ≥1 published customer review (same join as public rating). */
function publicCookHasPublishedReview(db: Database) {
    return exists(
        db
            .select({ customerTestimonialId: customerTestimonials.customerTestimonialId })
            .from(customerTestimonials)
            .innerJoin(bookingRequestOffers, eq(bookingRequestOffers.bookingRequestOfferId, customerTestimonials.bookingRequestOfferId))
            .where(and(eq(bookingRequestOffers.cookId, cooks.cookId), eq(customerTestimonials.publicationStatus, 'PUBLISHED'))),
    );
}

/** True when cuisine style and/or cooking philosophy is non-empty (card tags). */
const publicCookHasCuisineOrPhilosophy = sql`(
    (${cooks.cuisineStyle} is not null and trim(${cooks.cuisineStyle}) <> '')
    or (${cooks.cookingPhilosophy} is not null and trim(${cooks.cookingPhilosophy}) <> '')
)`;

/** Cook rows for the public chefs list / sitemap (visible, approved, ≥1 published meal with image). */
export async function publicVisibleCookIdsFindMany(
    db: Database,
    criterion?: Pick<GqlSPublicCookFindManyCriterion, 'searchText'> | null,
): Promise<Array<{ cookId: string; createdAt: Date; lastModifiedAt: Date; cook: Cook }>> {
    const where = and(publicCookListedWhere(db), publicCookFindManySearchWhere(criterion));

    const rows = await db
        .select({ cook: cooks })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(where)
        .orderBy(
            desc(sql`(${users.profilePictureFileUploadId} is not null)`),
            desc(sql`(${publicCookHasPublishedReview(db)})`),
            desc(publicCookHasCuisineOrPhilosophy),
            asc(users.firstName),
        );

    return rows.map((row) => ({
        cookId: row.cook.cookId,
        createdAt: row.cook.createdAt,
        lastModifiedAt: row.cook.lastModifiedAt,
        cook: row.cook,
    }));
}
