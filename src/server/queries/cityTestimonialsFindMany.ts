import { asc, eq } from 'drizzle-orm';

import { cityTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCityTestimonial, GqlSPublicCity } from '../graphql/generated';
import { toGqlCookTestimonial } from '../mappers/toGqlCookTestimonial';
import { toGqlCustomerTestimonial } from '../mappers/toGqlCustomerTestimonial';
import { testimonialCatalogEntriesLoad } from '../utils/testimonialCatalogEntriesLoad';

/** `PublicCity.testimonials` — published entries only. */
export async function cityTestimonialsFindMany(parent: GqlSPublicCity, serverRuntime: ServerRuntime): Promise<GqlSCityTestimonial[]> {
    const junctionRows = await serverRuntime.db
        .select()
        .from(cityTestimonials)
        .where(eq(cityTestimonials.cityId, parent.cityId))
        .orderBy(asc(cityTestimonials.index));
    return testimonialCatalogEntriesLoad(junctionRows, serverRuntime, {
        publishedOnly: true,
        toCustomer: toGqlCustomerTestimonial,
        toCook: toGqlCookTestimonial,
    });
}
