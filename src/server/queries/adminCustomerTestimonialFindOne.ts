import { eq } from 'drizzle-orm';

import { customerTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCustomerTestimonial, GqlSAdminCustomerTestimonialArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminCustomerTestimonial } from '../mappers/toGqlAdminCustomerTestimonial';
import { testimonialOfferFallbacksLoad } from '../utils/testimonialOfferFallbacksLoad';

export async function adminCustomerTestimonialFindOne(
    args: GqlSAdminCustomerTestimonialArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminCustomerTestimonial | null> {
    try {
        const [row] = await serverRuntime.db
            .select()
            .from(customerTestimonials)
            .where(eq(customerTestimonials.customerTestimonialId, args.customerTestimonialId))
            .limit(1);
        if (!row) return null;

        if (!row.bookingRequestOfferId) return toGqlAdminCustomerTestimonial(row);

        const fallbacksByOfferId = await testimonialOfferFallbacksLoad(serverRuntime.db, [row.bookingRequestOfferId], 'customer');
        return toGqlAdminCustomerTestimonial(row, fallbacksByOfferId.get(row.bookingRequestOfferId) ?? null);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
