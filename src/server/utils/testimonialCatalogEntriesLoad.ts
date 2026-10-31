import { inArray } from 'drizzle-orm';

import type { CityTestimonial, CookTestimonial, CustomerTestimonial, OccasionTestimonial, PartnerTestimonial } from '../db/schema';
import { cookTestimonials, customerTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSFileUpload } from '../graphql/generated';
import { testimonialAuthorProfilePicturesLoad } from './testimonialAuthorProfilePicturesLoad';
import { testimonialOfferFallbacksLoad } from './testimonialOfferFallbacksLoad';
import type { TestimonialOfferFallbacks } from './testimonialOfferFallbacksLoad';

type JunctionRow = Pick<CityTestimonial | PartnerTestimonial | OccasionTestimonial, 'testimonialType' | 'testimonialId' | 'index'>;

/**
 * Resolves ordered `CityTestimonials` / `PartnerTestimonials` /
 * `OccasionTestimonials` junction rows into the polymorphic `Testimonial` /
 * `AdminTestimonial` union — shared by the city, partner, and occasion
 * catalogs (public + admin variants). Skips entries
 * whose target row was deleted; public variants (`publishedOnly: true`) also
 * skip `PENDING_REVIEW` rows.
 */
export async function testimonialCatalogEntriesLoad<TCustomer, TCook>(
    junctionRows: JunctionRow[],
    serverRuntime: ServerRuntime,
    args: {
        publishedOnly: boolean;
        toCustomer: (
            row: CustomerTestimonial,
            fallback: TestimonialOfferFallbacks | null,
            authorProfilePicture: GqlSFileUpload | null,
        ) => TCustomer;
        toCook: (row: CookTestimonial, fallback: TestimonialOfferFallbacks | null, authorProfilePicture: GqlSFileUpload | null) => TCook;
    },
): Promise<Array<{ index: number; testimonial: TCustomer | TCook }>> {
    if (junctionRows.length === 0) return [];

    const customerIds = junctionRows.filter((row) => row.testimonialType === 'CUSTOMER').map((row) => row.testimonialId);
    const cookIds = junctionRows.filter((row) => row.testimonialType === 'COOK').map((row) => row.testimonialId);

    const [customerRows, cookRows] = await Promise.all([
        customerIds.length > 0
            ? serverRuntime.db.select().from(customerTestimonials).where(inArray(customerTestimonials.customerTestimonialId, customerIds))
            : Promise.resolve([]),
        cookIds.length > 0
            ? serverRuntime.db.select().from(cookTestimonials).where(inArray(cookTestimonials.cookTestimonialId, cookIds))
            : Promise.resolve([]),
    ]);

    const customerById = new Map(customerRows.map((row) => [row.customerTestimonialId, row]));
    const cookById = new Map(cookRows.map((row) => [row.cookTestimonialId, row]));

    const customerOfferIds = customerRows.flatMap((row) => (row.bookingRequestOfferId ? [row.bookingRequestOfferId] : []));
    const cookOfferIds = cookRows.flatMap((row) => (row.bookingRequestOfferId ? [row.bookingRequestOfferId] : []));
    const [customerFallbacks, cookFallbacks, authorPicturesByUserId] = await Promise.all([
        testimonialOfferFallbacksLoad(serverRuntime.db, customerOfferIds, 'customer'),
        testimonialOfferFallbacksLoad(serverRuntime.db, cookOfferIds, 'cook'),
        testimonialAuthorProfilePicturesLoad(serverRuntime.db, [
            ...customerRows.map((row) => row.userId),
            ...cookRows.map((row) => row.userId),
        ]),
    ]);

    const result: Array<{ index: number; testimonial: TCustomer | TCook }> = [];
    for (const junction of junctionRows) {
        if (junction.testimonialType === 'CUSTOMER') {
            const row = customerById.get(junction.testimonialId);
            if (!row) continue;
            if (args.publishedOnly && row.publicationStatus !== 'PUBLISHED') continue;
            const fallback = row.bookingRequestOfferId ? (customerFallbacks.get(row.bookingRequestOfferId) ?? null) : null;
            result.push({
                index: junction.index,
                testimonial: args.toCustomer(row, fallback, authorPicturesByUserId.get(row.userId) ?? null),
            });
        } else {
            const row = cookById.get(junction.testimonialId);
            if (!row) continue;
            if (args.publishedOnly && row.publicationStatus !== 'PUBLISHED') continue;
            const fallback = row.bookingRequestOfferId ? (cookFallbacks.get(row.bookingRequestOfferId) ?? null) : null;
            result.push({
                index: junction.index,
                testimonial: args.toCook(row, fallback, authorPicturesByUserId.get(row.userId) ?? null),
            });
        }
    }
    return result;
}
