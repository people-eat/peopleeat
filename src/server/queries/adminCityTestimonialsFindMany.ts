import { asc, eq } from 'drizzle-orm';

import { cityTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCity, GqlSAdminCityTestimonial } from '../graphql/generated';
import { toGqlAdminCookTestimonial } from '../mappers/toGqlAdminCookTestimonial';
import { toGqlAdminCustomerTestimonial } from '../mappers/toGqlAdminCustomerTestimonial';
import { testimonialCatalogEntriesLoad } from '../utils/testimonialCatalogEntriesLoad';

/** `AdminCity.testimonials` — draft + published entries. */
export async function adminCityTestimonialsFindMany(
    parent: GqlSAdminCity,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminCityTestimonial[]> {
    const junctionRows = await serverRuntime.db
        .select()
        .from(cityTestimonials)
        .where(eq(cityTestimonials.cityId, parent.cityId))
        .orderBy(asc(cityTestimonials.index));
    return testimonialCatalogEntriesLoad(junctionRows, serverRuntime, {
        publishedOnly: false,
        toCustomer: toGqlAdminCustomerTestimonial,
        toCook: toGqlAdminCookTestimonial,
    });
}
