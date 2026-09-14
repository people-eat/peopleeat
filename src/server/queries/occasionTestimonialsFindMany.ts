import { asc, eq } from 'drizzle-orm';

import { occasionTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSOccasionTestimonial, GqlSPublicOccasion } from '../graphql/generated';
import { toGqlCookTestimonial } from '../mappers/toGqlCookTestimonial';
import { toGqlCustomerTestimonial } from '../mappers/toGqlCustomerTestimonial';
import { testimonialCatalogEntriesLoad } from '../utils/testimonialCatalogEntriesLoad';

/** `PublicOccasion.testimonials` — published entries only. */
export async function occasionTestimonialsFindMany(
    parent: GqlSPublicOccasion,
    serverRuntime: ServerRuntime,
): Promise<GqlSOccasionTestimonial[]> {
    const junctionRows = await serverRuntime.db
        .select()
        .from(occasionTestimonials)
        .where(eq(occasionTestimonials.occasionId, parent.occasionId))
        .orderBy(asc(occasionTestimonials.index));
    return testimonialCatalogEntriesLoad(junctionRows, serverRuntime, {
        publishedOnly: true,
        toCustomer: toGqlCustomerTestimonial,
        toCook: toGqlCookTestimonial,
    });
}
