import { eq } from 'drizzle-orm';

import { cookTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCookTestimonial, GqlSSession } from '../graphql/generated';
import { toGqlAdminCookTestimonial } from '../mappers/toGqlAdminCookTestimonial';
import { testimonialOfferFallbacksLoad } from '../utils/testimonialOfferFallbacksLoad';

/** `AdminBookingRequestOffer.cookTestimonial` field resolver. */
export async function adminCookTestimonialFindOneByOfferId(
    bookingRequestOfferId: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminCookTestimonial | null> {
    try {
        const [row] = await serverRuntime.db
            .select()
            .from(cookTestimonials)
            .where(eq(cookTestimonials.bookingRequestOfferId, bookingRequestOfferId))
            .limit(1);
        if (!row) return null;

        const fallbacksByOfferId = await testimonialOfferFallbacksLoad(serverRuntime.db, [bookingRequestOfferId], 'cook');
        return toGqlAdminCookTestimonial(row, fallbacksByOfferId.get(bookingRequestOfferId) ?? null);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
