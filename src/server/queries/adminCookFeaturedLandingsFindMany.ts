import { eq } from 'drizzle-orm';

import { cities, cityCooks, occasionCooks, occasions, partnerVenueCooks, partnerVenues } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCookFeaturedLanding } from '../graphql/generated';

/** Reverse index: city / partner-venue / occasion landings that currently feature this cook. */
export async function adminCookFeaturedLandingsFindMany(
    cookId: string,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminCookFeaturedLanding[]> {
    const [cityRows, partnerRows, occasionRows] = await Promise.all([
        serverRuntime.db
            .select({
                id: cities.cityId,
                titleDe: cities.titleDe,
                titleEn: cities.titleEn,
                pathName: cities.pathName,
            })
            .from(cityCooks)
            .innerJoin(cities, eq(cities.cityId, cityCooks.cityId))
            .where(eq(cityCooks.cookId, cookId)),
        serverRuntime.db
            .select({
                id: partnerVenues.partnerVenueId,
                titleDe: partnerVenues.titleDe,
                titleEn: partnerVenues.titleEn,
                pathName: partnerVenues.pathName,
            })
            .from(partnerVenueCooks)
            .innerJoin(partnerVenues, eq(partnerVenues.partnerVenueId, partnerVenueCooks.partnerVenueId))
            .where(eq(partnerVenueCooks.cookId, cookId)),
        serverRuntime.db
            .select({
                id: occasions.occasionId,
                titleDe: occasions.titleDe,
                titleEn: occasions.titleEn,
                pathName: occasions.pathName,
            })
            .from(occasionCooks)
            .innerJoin(occasions, eq(occasions.occasionId, occasionCooks.occasionId))
            .where(eq(occasionCooks.cookId, cookId)),
    ]);

    return [
        ...cityRows.map((row): GqlSAdminCookFeaturedLanding => ({
            kind: 'CITY',
            id: row.id,
            titleDe: row.titleDe,
            titleEn: row.titleEn,
            pathName: row.pathName,
        })),
        ...partnerRows.map((row): GqlSAdminCookFeaturedLanding => ({
            kind: 'PARTNER_VENUE',
            id: row.id,
            titleDe: row.titleDe,
            titleEn: row.titleEn,
            pathName: row.pathName,
        })),
        ...occasionRows.map((row): GqlSAdminCookFeaturedLanding => ({
            kind: 'OCCASION',
            id: row.id,
            titleDe: row.titleDe,
            titleEn: row.titleEn,
            pathName: row.pathName,
        })),
    ];
}
