import { desc } from 'drizzle-orm';

import { customerTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCustomerTestimonial, GqlSSession } from '../graphql/generated';
import { toGqlAdminCustomerTestimonial } from '../mappers/toGqlAdminCustomerTestimonial';
import { testimonialOfferFallbacksLoad } from '../utils/testimonialOfferFallbacksLoad';

export async function adminCustomerTestimonialsFindMany(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminCustomerTestimonial[]> {
    try {
        const rows = await serverRuntime.db.select().from(customerTestimonials).orderBy(desc(customerTestimonials.createdAt));

        const offerIds = rows.flatMap((row) => (row.bookingRequestOfferId ? [row.bookingRequestOfferId] : []));
        const fallbacksByOfferId = await testimonialOfferFallbacksLoad(serverRuntime.db, offerIds, 'customer');

        return rows.map((row) =>
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
