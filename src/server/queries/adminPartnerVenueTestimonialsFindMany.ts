import { asc, eq } from 'drizzle-orm';

import { partnerVenueTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminPageTestimonial, GqlSAdminPartnerVenue } from '../graphql/generated';
import { toGqlAdminCookTestimonial } from '../mappers/toGqlAdminCookTestimonial';
import { toGqlAdminCustomerTestimonial } from '../mappers/toGqlAdminCustomerTestimonial';
import { testimonialCatalogEntriesLoad } from '../utils/testimonialCatalogEntriesLoad';

/** `AdminPartnerVenue.testimonials` — draft + published entries. */
export async function adminPartnerVenueTestimonialsFindMany(
    parent: GqlSAdminPartnerVenue,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminPageTestimonial[]> {
    const junctionRows = await serverRuntime.db
        .select()
        .from(partnerVenueTestimonials)
        .where(eq(partnerVenueTestimonials.partnerVenueId, parent.partnerVenueId))
        .orderBy(asc(partnerVenueTestimonials.index));
    return testimonialCatalogEntriesLoad(junctionRows, serverRuntime, {
        publishedOnly: false,
        toCustomer: toGqlAdminCustomerTestimonial,
        toCook: toGqlAdminCookTestimonial,
    });
}
