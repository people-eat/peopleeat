import { eq } from 'drizzle-orm';

import { customerTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCustomerTestimonial, GqlSAdminCustomerTestimonialArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminCustomerTestimonial } from '../mappers/toGqlAdminCustomerTestimonial';
import { adminTestimonialPublicPagePlacementsAttach } from '../utils/adminTestimonialPublicPagePlacementsLoad';
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

        const mapped = row.bookingRequestOfferId
            ? toGqlAdminCustomerTestimonial(
                  row,
                  (await testimonialOfferFallbacksLoad(serverRuntime.db, [row.bookingRequestOfferId], 'customer')).get(
                      row.bookingRequestOfferId,
                  ) ?? null,
              )
            : toGqlAdminCustomerTestimonial(row);

        const [withPlacements] = await adminTestimonialPublicPagePlacementsAttach(serverRuntime.db, [
            {
                testimonialType: 'CUSTOMER',
                testimonialId: mapped.customerTestimonialId,
                testimonial: mapped,
                publicationStatus: mapped.publicationStatus,
                bookingRequestOfferId: mapped.bookingRequestOfferId,
            },
        ]);
        return withPlacements ?? mapped;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
