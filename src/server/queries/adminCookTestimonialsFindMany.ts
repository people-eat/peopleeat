import { desc, inArray } from 'drizzle-orm';

import { cookTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCookTestimonial, GqlSAdminCookTestimonialCriterion, GqlSSession } from '../graphql/generated';
import { toGqlAdminCookTestimonial } from '../mappers/toGqlAdminCookTestimonial';
import { adminTestimonialPublicPagePlacementsAttach } from '../utils/adminTestimonialPublicPagePlacementsLoad';
import { findManySkip, findManyTake } from '../utils/findManyTake';
import { testimonialOfferFallbacksLoad } from '../utils/testimonialOfferFallbacksLoad';

export async function adminCookTestimonialsFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
    criterion?: GqlSAdminCookTestimonialCriterion | null,
): Promise<GqlSAdminCookTestimonial[]> {
    try {
        const cookIds = criterion?.cookIds?.filter(Boolean) ?? [];
        const where = cookIds.length > 0 ? inArray(cookTestimonials.cookId, cookIds) : undefined;

        const baseQuery = serverRuntime.db.select().from(cookTestimonials).where(where).orderBy(desc(cookTestimonials.createdAt));

        const rows =
            criterion != null ? await baseQuery.limit(findManyTake(criterion.take)).offset(findManySkip(criterion.skip)) : await baseQuery;

        const offerIds = rows.flatMap((row) => (row.bookingRequestOfferId ? [row.bookingRequestOfferId] : []));
        const fallbacksByOfferId = await testimonialOfferFallbacksLoad(serverRuntime.db, offerIds, 'cook');

        const mapped = rows.map((row) =>
            toGqlAdminCookTestimonial(row, row.bookingRequestOfferId ? (fallbacksByOfferId.get(row.bookingRequestOfferId) ?? null) : null),
        );
        return adminTestimonialPublicPagePlacementsAttach(
            serverRuntime.db,
            mapped.map((testimonial) => ({
                testimonialType: 'COOK' as const,
                testimonialId: testimonial.cookTestimonialId,
                testimonial,
                publicationStatus: testimonial.publicationStatus,
                bookingRequestOfferId: testimonial.bookingRequestOfferId,
            })),
        );
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
