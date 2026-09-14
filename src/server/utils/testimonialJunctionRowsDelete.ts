import { and, eq } from 'drizzle-orm';

import type { Database, DatabaseTransaction } from '../db';
import { cityTestimonials, occasionTestimonials, partnerTestimonials } from '../db/schema';
import type { TestimonialType } from '../domain/testimonial';

/**
 * Removes a testimonial from every city / partner / occasion curation junction. Called
 * before deleting the underlying `CustomerTestimonials` / `CookTestimonials`
 * row — the junction tables have no FK to those catalogs (polymorphic
 * `testimonialType` + `testimonialId`), so cleanup is manual.
 */
export async function testimonialJunctionRowsDelete(
    dbOrTransaction: Database | DatabaseTransaction,
    args: { testimonialType: TestimonialType; testimonialId: string },
): Promise<void> {
    await Promise.all([
        dbOrTransaction
            .delete(cityTestimonials)
            .where(and(eq(cityTestimonials.testimonialType, args.testimonialType), eq(cityTestimonials.testimonialId, args.testimonialId))),
        dbOrTransaction
            .delete(partnerTestimonials)
            .where(
                and(
                    eq(partnerTestimonials.testimonialType, args.testimonialType),
                    eq(partnerTestimonials.testimonialId, args.testimonialId),
                ),
            ),
        dbOrTransaction
            .delete(occasionTestimonials)
            .where(
                and(
                    eq(occasionTestimonials.testimonialType, args.testimonialType),
                    eq(occasionTestimonials.testimonialId, args.testimonialId),
                ),
            ),
    ]);
}
