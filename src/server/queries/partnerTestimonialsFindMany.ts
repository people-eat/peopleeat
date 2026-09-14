import { asc, eq } from 'drizzle-orm';

import { partnerTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPartnerTestimonial, GqlSPublicPartner } from '../graphql/generated';
import { toGqlCookTestimonial } from '../mappers/toGqlCookTestimonial';
import { toGqlCustomerTestimonial } from '../mappers/toGqlCustomerTestimonial';
import { testimonialCatalogEntriesLoad } from '../utils/testimonialCatalogEntriesLoad';

/** `PublicPartner.testimonials` — published entries only. */
export async function partnerTestimonialsFindMany(
    parent: GqlSPublicPartner,
    serverRuntime: ServerRuntime,
): Promise<GqlSPartnerTestimonial[]> {
    const junctionRows = await serverRuntime.db
        .select()
        .from(partnerTestimonials)
        .where(eq(partnerTestimonials.partnerId, parent.partnerId))
        .orderBy(asc(partnerTestimonials.index));
    return testimonialCatalogEntriesLoad(junctionRows, serverRuntime, {
        publishedOnly: true,
        toCustomer: toGqlCustomerTestimonial,
        toCook: toGqlCookTestimonial,
    });
}
