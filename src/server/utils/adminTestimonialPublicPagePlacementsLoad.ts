import { and, eq, inArray } from 'drizzle-orm';

import { userDisplayName } from '../../shared';
import type { Database, DatabaseTransaction } from '../db';
import {
    bookingRequestOffers,
    cities,
    cityTestimonials,
    cooks,
    occasions,
    occasionTestimonials,
    partnerVenues,
    partnerVenueTestimonials,
    users,
} from '../db/schema';
import type { TestimonialPublicationStatus, TestimonialType } from '../domain/testimonial';
import type { GqlSAdminTestimonialPublicPagePlacement } from '../graphql/generated';

type AdminTestimonialPublicPagePlacementKey = {
    testimonialType: TestimonialType;
    testimonialId: string;
    publicationStatus: TestimonialPublicationStatus;
    bookingRequestOfferId: string | null;
};

function placementKey(testimonialType: TestimonialType, testimonialId: string): string {
    return `${testimonialType}:${testimonialId}`;
}

/**
 * Batch-loads public-page placements for admin testimonial cards / detail.
 * City, partner, and occasion come from curation junctions; CHEF is added for
 * published customer testimonials linked to an offer (cook public profile).
 */
async function adminTestimonialPublicPagePlacementsLoad(
    dbOrTransaction: Database | DatabaseTransaction,
    keys: ReadonlyArray<AdminTestimonialPublicPagePlacementKey>,
): Promise<Map<string, GqlSAdminTestimonialPublicPagePlacement[]>> {
    const result = new Map<string, GqlSAdminTestimonialPublicPagePlacement[]>();
    if (keys.length === 0) return result;

    for (const key of keys) {
        result.set(placementKey(key.testimonialType, key.testimonialId), []);
    }

    const customerIds = keys.filter((key) => key.testimonialType === 'CUSTOMER').map((key) => key.testimonialId);
    const cookIds = keys.filter((key) => key.testimonialType === 'COOK').map((key) => key.testimonialId);

    const [cityCustomerRows, cityCookRows, partnerCustomerRows, partnerCookRows, occasionCustomerRows, occasionCookRows] =
        await Promise.all([
            customerIds.length > 0
                ? dbOrTransaction
                      .select({
                          testimonialId: cityTestimonials.testimonialId,
                          cityId: cities.cityId,
                          labelDe: cities.nameDe,
                          labelEn: cities.nameEn,
                          pathName: cities.pathName,
                          index: cityTestimonials.index,
                      })
                      .from(cityTestimonials)
                      .innerJoin(cities, eq(cities.cityId, cityTestimonials.cityId))
                      .where(and(eq(cityTestimonials.testimonialType, 'CUSTOMER'), inArray(cityTestimonials.testimonialId, customerIds)))
                : Promise.resolve([]),
            cookIds.length > 0
                ? dbOrTransaction
                      .select({
                          testimonialId: cityTestimonials.testimonialId,
                          cityId: cities.cityId,
                          labelDe: cities.nameDe,
                          labelEn: cities.nameEn,
                          pathName: cities.pathName,
                          index: cityTestimonials.index,
                      })
                      .from(cityTestimonials)
                      .innerJoin(cities, eq(cities.cityId, cityTestimonials.cityId))
                      .where(and(eq(cityTestimonials.testimonialType, 'COOK'), inArray(cityTestimonials.testimonialId, cookIds)))
                : Promise.resolve([]),
            customerIds.length > 0
                ? dbOrTransaction
                      .select({
                          testimonialId: partnerVenueTestimonials.testimonialId,
                          partnerVenueId: partnerVenues.partnerVenueId,
                          label: partnerVenues.name,
                          pathName: partnerVenues.pathName,
                          index: partnerVenueTestimonials.index,
                      })
                      .from(partnerVenueTestimonials)
                      .innerJoin(partnerVenues, eq(partnerVenues.partnerVenueId, partnerVenueTestimonials.partnerVenueId))
                      .where(
                          and(
                              eq(partnerVenueTestimonials.testimonialType, 'CUSTOMER'),
                              inArray(partnerVenueTestimonials.testimonialId, customerIds),
                          ),
                      )
                : Promise.resolve([]),
            cookIds.length > 0
                ? dbOrTransaction
                      .select({
                          testimonialId: partnerVenueTestimonials.testimonialId,
                          partnerVenueId: partnerVenues.partnerVenueId,
                          label: partnerVenues.name,
                          pathName: partnerVenues.pathName,
                          index: partnerVenueTestimonials.index,
                      })
                      .from(partnerVenueTestimonials)
                      .innerJoin(partnerVenues, eq(partnerVenues.partnerVenueId, partnerVenueTestimonials.partnerVenueId))
                      .where(
                          and(
                              eq(partnerVenueTestimonials.testimonialType, 'COOK'),
                              inArray(partnerVenueTestimonials.testimonialId, cookIds),
                          ),
                      )
                : Promise.resolve([]),
            customerIds.length > 0
                ? dbOrTransaction
                      .select({
                          testimonialId: occasionTestimonials.testimonialId,
                          occasionId: occasions.occasionId,
                          label: occasions.name,
                          pathName: occasions.pathName,
                          index: occasionTestimonials.index,
                      })
                      .from(occasionTestimonials)
                      .innerJoin(occasions, eq(occasions.occasionId, occasionTestimonials.occasionId))
                      .where(
                          and(
                              eq(occasionTestimonials.testimonialType, 'CUSTOMER'),
                              inArray(occasionTestimonials.testimonialId, customerIds),
                          ),
                      )
                : Promise.resolve([]),
            cookIds.length > 0
                ? dbOrTransaction
                      .select({
                          testimonialId: occasionTestimonials.testimonialId,
                          occasionId: occasions.occasionId,
                          label: occasions.name,
                          pathName: occasions.pathName,
                          index: occasionTestimonials.index,
                      })
                      .from(occasionTestimonials)
                      .innerJoin(occasions, eq(occasions.occasionId, occasionTestimonials.occasionId))
                      .where(and(eq(occasionTestimonials.testimonialType, 'COOK'), inArray(occasionTestimonials.testimonialId, cookIds)))
                : Promise.resolve([]),
        ]);

    const push = (mapKey: string, placement: GqlSAdminTestimonialPublicPagePlacement) => {
        const list = result.get(mapKey);
        if (list) list.push(placement);
        else result.set(mapKey, [placement]);
    };

    for (const row of cityCustomerRows) {
        push(placementKey('CUSTOMER', row.testimonialId), {
            kind: 'CITY',
            entityId: row.cityId,
            labelDe: row.labelDe,
            labelEn: row.labelEn || row.labelDe,
            pathName: row.pathName,
            index: row.index,
        });
    }
    for (const row of cityCookRows) {
        push(placementKey('COOK', row.testimonialId), {
            kind: 'CITY',
            entityId: row.cityId,
            labelDe: row.labelDe,
            labelEn: row.labelEn || row.labelDe,
            pathName: row.pathName,
            index: row.index,
        });
    }
    for (const row of partnerCustomerRows) {
        push(placementKey('CUSTOMER', row.testimonialId), {
            kind: 'PARTNER_VENUE',
            entityId: row.partnerVenueId,
            labelDe: row.label,
            labelEn: row.label,
            pathName: row.pathName,
            index: row.index,
        });
    }
    for (const row of partnerCookRows) {
        push(placementKey('COOK', row.testimonialId), {
            kind: 'PARTNER_VENUE',
            entityId: row.partnerVenueId,
            labelDe: row.label,
            labelEn: row.label,
            pathName: row.pathName,
            index: row.index,
        });
    }
    for (const row of occasionCustomerRows) {
        push(placementKey('CUSTOMER', row.testimonialId), {
            kind: 'OCCASION',
            entityId: row.occasionId,
            labelDe: row.label,
            labelEn: row.label,
            pathName: row.pathName,
            index: row.index,
        });
    }
    for (const row of occasionCookRows) {
        push(placementKey('COOK', row.testimonialId), {
            kind: 'OCCASION',
            entityId: row.occasionId,
            labelDe: row.label,
            labelEn: row.label,
            pathName: row.pathName,
            index: row.index,
        });
    }

    const chefCandidates = keys.filter(
        (key) => key.testimonialType === 'CUSTOMER' && key.publicationStatus === 'PUBLISHED' && key.bookingRequestOfferId,
    );
    const offerIds = [...new Set(chefCandidates.map((key) => key.bookingRequestOfferId!).filter(Boolean))];
    if (offerIds.length > 0) {
        const chefRows = await dbOrTransaction
            .select({
                bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId,
                cookId: cooks.cookId,
                pathName: cooks.pathName,
                stageName: cooks.stageName,
                firstName: users.firstName,
                lastName: users.lastName,
            })
            .from(bookingRequestOffers)
            .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
            .innerJoin(users, eq(users.userId, cooks.cookId))
            .where(inArray(bookingRequestOffers.bookingRequestOfferId, offerIds));

        const cookByOfferId = new Map(chefRows.map((row) => [row.bookingRequestOfferId, row]));
        for (const key of chefCandidates) {
            const cook = key.bookingRequestOfferId ? cookByOfferId.get(key.bookingRequestOfferId) : undefined;
            if (!cook) continue;
            const label = cook.stageName?.trim() || userDisplayName({ firstName: cook.firstName, lastName: cook.lastName });
            push(placementKey('CUSTOMER', key.testimonialId), {
                kind: 'CHEF',
                entityId: cook.cookId,
                labelDe: label,
                labelEn: label,
                pathName: cook.pathName,
                index: null,
            });
        }
    }

    for (const [, placements] of result) {
        placements.sort((a, b) => {
            const kindOrder = { CITY: 0, PARTNER_VENUE: 1, OCCASION: 2, CHEF: 3 } as const;
            const kindDiff = kindOrder[a.kind] - kindOrder[b.kind];
            if (kindDiff !== 0) return kindDiff;
            const indexA = a.index ?? Number.MAX_SAFE_INTEGER;
            const indexB = b.index ?? Number.MAX_SAFE_INTEGER;
            if (indexA !== indexB) return indexA - indexB;
            return a.labelDe.localeCompare(b.labelDe);
        });
    }

    return result;
}

/** Attaches batched `publicPagePlacements` onto already-mapped admin testimonial GQL objects. */
export async function adminTestimonialPublicPagePlacementsAttach<
    T extends { publicPagePlacements: GqlSAdminTestimonialPublicPagePlacement[] },
>(
    dbOrTransaction: Database | DatabaseTransaction,
    items: ReadonlyArray<{
        testimonialType: TestimonialType;
        testimonialId: string;
        testimonial: T;
        publicationStatus: TestimonialPublicationStatus;
        bookingRequestOfferId: string | null | undefined;
    }>,
): Promise<T[]> {
    const placementsByKey = await adminTestimonialPublicPagePlacementsLoad(
        dbOrTransaction,
        items.map((item) => ({
            testimonialType: item.testimonialType,
            testimonialId: item.testimonialId,
            publicationStatus: item.publicationStatus,
            bookingRequestOfferId: item.bookingRequestOfferId ?? null,
        })),
    );

    return items.map((item) => ({
        ...item.testimonial,
        publicPagePlacements: placementsByKey.get(placementKey(item.testimonialType, item.testimonialId)) ?? [],
    }));
}
