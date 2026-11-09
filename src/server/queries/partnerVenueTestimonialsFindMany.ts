import { asc, eq } from 'drizzle-orm';

import { partnerVenueTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPageTestimonial, GqlSPublicPartnerVenue } from '../graphql/generated';
import { toGqlCookTestimonial } from '../mappers/toGqlCookTestimonial';
import { toGqlCustomerTestimonial } from '../mappers/toGqlCustomerTestimonial';
import { testimonialCatalogEntriesLoad } from '../utils/testimonialCatalogEntriesLoad';

/** `PublicPartnerVenue.testimonials` — published entries only. */
export async function partnerVenueTestimonialsFindMany(
    parent: GqlSPublicPartnerVenue,
    serverRuntime: ServerRuntime,
): Promise<GqlSPageTestimonial[]> {
    const junctionRows = await serverRuntime.db
        .select()
        .from(partnerVenueTestimonials)
        .where(eq(partnerVenueTestimonials.partnerVenueId, parent.partnerVenueId))
        .orderBy(asc(partnerVenueTestimonials.index));
    return testimonialCatalogEntriesLoad(junctionRows, serverRuntime, {
        publishedOnly: true,
        toCustomer: toGqlCustomerTestimonial,
        toCook: toGqlCookTestimonial,
    });
}
