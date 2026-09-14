import { eq } from 'drizzle-orm';

import { customerTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCustomerTestimonial, GqlSSession } from '../graphql/generated';
import { toGqlAdminCustomerTestimonial } from '../mappers/toGqlAdminCustomerTestimonial';
import { testimonialOfferFallbacksLoad } from '../utils/testimonialOfferFallbacksLoad';

/** `AdminBookingRequestOffer.customerTestimonial` field resolver. */
export async function adminCustomerTestimonialFindOneByOfferId(
    bookingRequestOfferId: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminCustomerTestimonial | null> {
    try {
        const [row] = await serverRuntime.db
            .select()
            .from(customerTestimonials)
            .where(eq(customerTestimonials.bookingRequestOfferId, bookingRequestOfferId))
            .limit(1);
        if (!row) return null;

        const fallbacksByOfferId = await testimonialOfferFallbacksLoad(serverRuntime.db, [bookingRequestOfferId], 'customer');
        return toGqlAdminCustomerTestimonial(row, fallbacksByOfferId.get(bookingRequestOfferId) ?? null);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
