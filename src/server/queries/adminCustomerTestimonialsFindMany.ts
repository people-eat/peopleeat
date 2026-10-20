import { desc, eq, inArray } from 'drizzle-orm';

import { bookingRequestOffers, customerTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCustomerTestimonial, GqlSAdminCustomerTestimonialCriterion, GqlSSession } from '../graphql/generated';
import { toGqlAdminCustomerTestimonial } from '../mappers/toGqlAdminCustomerTestimonial';
import { findManySkip, findManyTake } from '../utils/findManyTake';
import { testimonialOfferFallbacksLoad } from '../utils/testimonialOfferFallbacksLoad';

export async function adminCustomerTestimonialsFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
    criterion?: GqlSAdminCustomerTestimonialCriterion | null,
): Promise<GqlSAdminCustomerTestimonial[]> {
    try {
        const cookIds = criterion?.cookIds?.filter(Boolean) ?? [];
        const scoped = cookIds.length > 0;

        // Full catalog (list + curation pickers): no criterion → unbounded.
        if (criterion == null) {
            const rows = await serverRuntime.db.select().from(customerTestimonials).orderBy(desc(customerTestimonials.createdAt));
            const offerIds = rows.flatMap((row) => (row.bookingRequestOfferId ? [row.bookingRequestOfferId] : []));
            const fallbacksByOfferId = await testimonialOfferFallbacksLoad(serverRuntime.db, offerIds, 'customer');
            return rows.map((row) =>
                toGqlAdminCustomerTestimonial(
                    row,
                    row.bookingRequestOfferId ? (fallbacksByOfferId.get(row.bookingRequestOfferId) ?? null) : null,
                ),
            );
        }

        const query = scoped
            ? serverRuntime.db
                  .select({ testimonial: customerTestimonials })
                  .from(customerTestimonials)
                  .innerJoin(
                      bookingRequestOffers,
                      eq(bookingRequestOffers.bookingRequestOfferId, customerTestimonials.bookingRequestOfferId),
                  )
                  .where(inArray(bookingRequestOffers.cookId, cookIds))
                  .orderBy(desc(customerTestimonials.createdAt))
                  .limit(findManyTake(criterion.take))
                  .offset(findManySkip(criterion.skip))
            : serverRuntime.db
                  .select({ testimonial: customerTestimonials })
                  .from(customerTestimonials)
                  .orderBy(desc(customerTestimonials.createdAt))
                  .limit(findManyTake(criterion.take))
                  .offset(findManySkip(criterion.skip));

        const rows = await query;
        const testimonials = rows.map((row) => row.testimonial);
        const offerIds = testimonials.flatMap((row) => (row.bookingRequestOfferId ? [row.bookingRequestOfferId] : []));
        const fallbacksByOfferId = await testimonialOfferFallbacksLoad(serverRuntime.db, offerIds, 'customer');

        return testimonials.map((row) =>
            toGqlAdminCustomerTestimonial(
                row,
                row.bookingRequestOfferId ? (fallbacksByOfferId.get(row.bookingRequestOfferId) ?? null) : null,
            ),
        );
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
