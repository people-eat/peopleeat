import { and, asc, desc, eq, isNotNull, lte, sql } from 'drizzle-orm';

import type { CityCountryCode } from '../../shared/cityCountryCode';
import { isNanoId } from '../../shared/idCreate';
import type { Database } from '../db';
import { blogPosts, cities, occasions, partnerVenues } from '../db/schema';
import type { BlogPost, City, Occasion, PartnerVenue } from '../db/schema';

function publishedNow() {
    return new Date();
}

export async function cityFindByPathNameAny(db: Database, pathName: string): Promise<City | null> {
    const [byCurrent] = await db.select().from(cities).where(eq(cities.pathName, pathName)).limit(1);
    if (byCurrent) return byCurrent;
    const [byPrevious] = await db
        .select()
        .from(cities)
        .where(sql`${pathName} = any(${cities.previousPathNames})`)
        .limit(1);
    return byPrevious ?? null;
}

export async function partnerVenueFindByPathNameAny(db: Database, pathName: string): Promise<PartnerVenue | null> {
    const [byCurrent] = await db.select().from(partnerVenues).where(eq(partnerVenues.pathName, pathName)).limit(1);
    if (byCurrent) return byCurrent;
    const [byPrevious] = await db
        .select()
        .from(partnerVenues)
        .where(sql`${pathName} = any(${partnerVenues.previousPathNames})`)
        .limit(1);
    if (byPrevious) return byPrevious;
    if (!isNanoId(pathName)) return null;
    const [byId] = await db.select().from(partnerVenues).where(eq(partnerVenues.partnerVenueId, pathName)).limit(1);
    return byId ?? null;
}

export async function occasionFindByPathNameAny(db: Database, pathName: string): Promise<Occasion | null> {
    const [byCurrent] = await db.select().from(occasions).where(eq(occasions.pathName, pathName)).limit(1);
    if (byCurrent) return byCurrent;
    const [byPrevious] = await db
        .select()
        .from(occasions)
        .where(sql`${pathName} = any(${occasions.previousPathNames})`)
        .limit(1);
    return byPrevious ?? null;
}

export async function blogPostFindByPathNameAny(db: Database, pathName: string): Promise<BlogPost | null> {
    const [byCurrent] = await db.select().from(blogPosts).where(eq(blogPosts.pathName, pathName)).limit(1);
    if (byCurrent) return byCurrent;
    const [byPrevious] = await db
        .select()
        .from(blogPosts)
        .where(sql`${pathName} = any(${blogPosts.previousPathNames})`)
        .limit(1);
    return byPrevious ?? null;
}

export function contentIsPublished(publishedAt: Date | null, now = publishedNow()): boolean {
    return publishedAt !== null && publishedAt <= now;
}

export async function publicPublishedCityNamesFindMany(
    db: Database,
): Promise<Array<Pick<City, 'pathName' | 'nameDe' | 'nameEn' | 'nameNl'>>> {
    const now = publishedNow();
    return db
        .select({ pathName: cities.pathName, nameDe: cities.nameDe, nameEn: cities.nameEn, nameNl: cities.nameNl })
        .from(cities)
        .where(and(isNotNull(cities.publishedAt), lte(cities.publishedAt, now)));
}

export async function publicPublishedCitiesFindMany(db: Database): Promise<City[]> {
    const now = publishedNow();
    return db
        .select()
        .from(cities)
        .where(and(isNotNull(cities.publishedAt), lte(cities.publishedAt, now)))
        .orderBy(desc(cities.publishedAt));
}

/**
 * Public city list, optionally narrowed by country.
 * NL/CH include unpublished drafts (coming-to hubs before guest launch).
 * DE / unfiltered stay published-only.
 */
export async function publicCitiesFindMany(db: Database, countryCode?: CityCountryCode | null): Promise<City[]> {
    if (!countryCode) {
        return publicPublishedCitiesFindMany(db);
    }

    if (countryCode === 'NL' || countryCode === 'CH') {
        return db.select().from(cities).where(eq(cities.countryCode, countryCode)).orderBy(asc(cities.nameDe));
    }

    const now = publishedNow();
    return db
        .select()
        .from(cities)
        .where(and(eq(cities.countryCode, countryCode), isNotNull(cities.publishedAt), lte(cities.publishedAt, now)))
        .orderBy(asc(cities.nameDe));
}

export async function publicPublishedPartnerVenuesFindMany(db: Database): Promise<PartnerVenue[]> {
    const now = publishedNow();
    return db
        .select()
        .from(partnerVenues)
        .where(and(isNotNull(partnerVenues.publishedAt), lte(partnerVenues.publishedAt, now)))
        .orderBy(desc(partnerVenues.publishedAt));
}

export async function publicPublishedOccasionsFindMany(db: Database): Promise<Occasion[]> {
    const now = publishedNow();
    return db
        .select()
        .from(occasions)
        .where(and(isNotNull(occasions.publishedAt), lte(occasions.publishedAt, now)))
        .orderBy(desc(occasions.publishedAt));
}

export async function publicPublishedBlogPostsFindMany(db: Database): Promise<BlogPost[]> {
    const now = publishedNow();
    return db
        .select()
        .from(blogPosts)
        .where(and(isNotNull(blogPosts.publishedAt), lte(blogPosts.publishedAt, now)))
        .orderBy(desc(blogPosts.publishedAt));
}
