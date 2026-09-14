import { eq } from 'drizzle-orm';

import { cookTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCookTestimonial, GqlSAdminCookTestimonialArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminCookTestimonial } from '../mappers/toGqlAdminCookTestimonial';
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

        if (!row.bookingRequestOfferId) return toGqlAdminCookTestimonial(row);

        const fallbacksByOfferId = await testimonialOfferFallbacksLoad(serverRuntime.db, [row.bookingRequestOfferId], 'cook');
        return toGqlAdminCookTestimonial(row, fallbacksByOfferId.get(row.bookingRequestOfferId) ?? null);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
