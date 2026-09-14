import { and, desc, eq, isNotNull, lte, sql } from 'drizzle-orm';

import type { Database } from '../db';
import { blogPosts, cities, occasions, partners } from '../db/schema';
import type { BlogPost, City, Occasion, Partner } from '../db/schema';

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

export async function partnerFindByPathNameAny(db: Database, pathName: string): Promise<Partner | null> {
    const [byCurrent] = await db.select().from(partners).where(eq(partners.pathName, pathName)).limit(1);
    if (byCurrent) return byCurrent;
    const [byPrevious] = await db
        .select()
        .from(partners)
        .where(sql`${pathName} = any(${partners.previousPathNames})`)
        .limit(1);
    return byPrevious ?? null;
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

export async function publicPublishedCitiesFindMany(db: Database): Promise<City[]> {
    const now = publishedNow();
    return db
        .select()
        .from(cities)
        .where(and(isNotNull(cities.publishedAt), lte(cities.publishedAt, now)))
        .orderBy(desc(cities.publishedAt));
}

export async function publicPublishedPartnersFindMany(db: Database): Promise<Partner[]> {
    const now = publishedNow();
    return db
        .select()
        .from(partners)
        .where(and(isNotNull(partners.publishedAt), lte(partners.publishedAt, now)))
        .orderBy(desc(partners.publishedAt));
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
