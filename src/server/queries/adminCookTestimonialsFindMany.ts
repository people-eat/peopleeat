import { desc } from 'drizzle-orm';

import { cookTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCookTestimonial, GqlSSession } from '../graphql/generated';
import { toGqlAdminCookTestimonial } from '../mappers/toGqlAdminCookTestimonial';
import { testimonialOfferFallbacksLoad } from '../utils/testimonialOfferFallbacksLoad';

export async function adminCookTestimonialsFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminCookTestimonial[]> {
    try {
        const rows = await serverRuntime.db.select().from(cookTestimonials).orderBy(desc(cookTestimonials.createdAt));

        const offerIds = rows.flatMap((row) => (row.bookingRequestOfferId ? [row.bookingRequestOfferId] : []));
        const fallbacksByOfferId = await testimonialOfferFallbacksLoad(serverRuntime.db, offerIds, 'cook');

        return rows.map((row) =>
            toGqlAdminCookTestimonial(row, row.bookingRequestOfferId ? (fallbacksByOfferId.get(row.bookingRequestOfferId) ?? null) : null),
        );
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
