import { eq } from 'drizzle-orm';

import { cookTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCookTestimonial, GqlSAdminCookTestimonialArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminCookTestimonial } from '../mappers/toGqlAdminCookTestimonial';
import { adminTestimonialPublicPagePlacementsAttach } from '../utils/adminTestimonialPublicPagePlacementsLoad';
import { testimonialOfferFallbacksLoad } from '../utils/testimonialOfferFallbacksLoad';

export async function adminCookTestimonialFindOne(
    args: GqlSAdminCookTestimonialArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminCookTestimonial | null> {
    try {
        const [row] = await serverRuntime.db
            .select()
            .from(cookTestimonials)
            .where(eq(cookTestimonials.cookTestimonialId, args.cookTestimonialId))
            .limit(1);
        if (!row) return null;

        const mapped = row.bookingRequestOfferId
            ? toGqlAdminCookTestimonial(
                  row,
                  (await testimonialOfferFallbacksLoad(serverRuntime.db, [row.bookingRequestOfferId], 'cook')).get(
                      row.bookingRequestOfferId,
                  ) ?? null,
              )
            : toGqlAdminCookTestimonial(row);

        const [withPlacements] = await adminTestimonialPublicPagePlacementsAttach(serverRuntime.db, [
            {
                testimonialType: 'COOK',
                testimonialId: mapped.cookTestimonialId,
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
