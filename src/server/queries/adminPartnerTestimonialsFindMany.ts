import { asc, eq } from 'drizzle-orm';

import { partnerTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminPartner, GqlSAdminPartnerTestimonial } from '../graphql/generated';
import { toGqlAdminCookTestimonial } from '../mappers/toGqlAdminCookTestimonial';
import { toGqlAdminCustomerTestimonial } from '../mappers/toGqlAdminCustomerTestimonial';
import { testimonialCatalogEntriesLoad } from '../utils/testimonialCatalogEntriesLoad';

/** `AdminPartner.testimonials` — draft + published entries. */
export async function adminPartnerTestimonialsFindMany(
    parent: GqlSAdminPartner,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminPartnerTestimonial[]> {
    const junctionRows = await serverRuntime.db
        .select()
        .from(partnerTestimonials)
        .where(eq(partnerTestimonials.partnerId, parent.partnerId))
        .orderBy(asc(partnerTestimonials.index));
    return testimonialCatalogEntriesLoad(junctionRows, serverRuntime, {
        publishedOnly: false,
        toCustomer: toGqlAdminCustomerTestimonial,
        toCook: toGqlAdminCookTestimonial,
    });
}
