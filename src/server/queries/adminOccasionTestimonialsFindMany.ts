import { asc, eq } from 'drizzle-orm';

import { occasionTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminOccasion, GqlSAdminOccasionTestimonial } from '../graphql/generated';
import { toGqlAdminCookTestimonial } from '../mappers/toGqlAdminCookTestimonial';
import { toGqlAdminCustomerTestimonial } from '../mappers/toGqlAdminCustomerTestimonial';
import { testimonialCatalogEntriesLoad } from '../utils/testimonialCatalogEntriesLoad';

/** `AdminOccasion.testimonials` — draft + published entries. */
export async function adminOccasionTestimonialsFindMany(
    parent: GqlSAdminOccasion,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminOccasionTestimonial[]> {
    const junctionRows = await serverRuntime.db
        .select()
        .from(occasionTestimonials)
        .where(eq(occasionTestimonials.occasionId, parent.occasionId))
        .orderBy(asc(occasionTestimonials.index));
    return testimonialCatalogEntriesLoad(junctionRows, serverRuntime, {
        publishedOnly: false,
        toCustomer: toGqlAdminCustomerTestimonial,
        toCook: toGqlAdminCookTestimonial,
    });
}
