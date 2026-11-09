import { and, eq, like, ne, or, sql } from 'drizzle-orm';

import { cookPathNameCandidate, cookPathNameFromNames, cookPathNameNormalize, cookPathNameTryNormalize } from '../../shared/cookPathName';
import { isNanoId } from '../../shared/idCreate';
import type { Database, DatabaseTransaction } from '../db';
import type { Cook } from '../db/schema';
import { cooks } from '../db/schema';
import { previousPathNamesArchive } from './contentPageUtils';

export type CookPathNameDb = Database | DatabaseTransaction;

export type CookPathNameAvailability = 'AVAILABLE' | 'INVALID' | 'TAKEN';

const ALLOCATE_MAX = 10_000;

export async function cookFindByPathNameAny(db: CookPathNameDb, pathName: string): Promise<Cook | null> {
    const [byCurrent] = await db.select().from(cooks).where(eq(cooks.pathName, pathName)).limit(1);
    if (byCurrent) return byCurrent;
    const [byPrevious] = await db
        .select()
        .from(cooks)
        .where(sql`${pathName} = any(${cooks.previousPathNames})`)
        .limit(1);
    if (byPrevious) return byPrevious;
    if (!isNanoId(pathName)) return null;
    const [byId] = await db.select().from(cooks).where(eq(cooks.cookId, pathName)).limit(1);
    return byId ?? null;
}

export async function cookPathNameTaken(db: CookPathNameDb, pathName: string, exceptCookId?: string): Promise<boolean> {
    const match = or(eq(cooks.pathName, pathName), sql`${pathName} = any(${cooks.previousPathNames})`, eq(cooks.cookId, pathName));
    const where = exceptCookId ? and(match, ne(cooks.cookId, exceptCookId)) : match;
    const [row] = await db.select({ cookId: cooks.cookId }).from(cooks).where(where).limit(1);
    return Boolean(row);
}

export async function cookPathNameAvailability(
    db: CookPathNameDb,
    pathName: string,
    exceptCookId?: string,
): Promise<CookPathNameAvailability> {
    const slug = cookPathNameTryNormalize(pathName);
    if (!slug) return 'INVALID';
    if (exceptCookId) {
        const [self] = await db.select({ pathName: cooks.pathName }).from(cooks).where(eq(cooks.cookId, exceptCookId)).limit(1);
        if (self?.pathName === slug) return 'AVAILABLE';
    }
    return (await cookPathNameTaken(db, slug, exceptCookId)) ? 'TAKEN' : 'AVAILABLE';
}

export async function cookPathNameAllocate(
    db: CookPathNameDb,
    firstName: string,
    lastName: string,
    exceptCookId?: string,
): Promise<string> {
    const base = cookPathNameFromNames(firstName, lastName);
    const prefix = `${base}-`;
    const match = or(
        eq(cooks.pathName, base),
        like(cooks.pathName, `${prefix}%`),
        eq(cooks.cookId, base),
        sql`${base} = any(${cooks.previousPathNames})`,
        sql`exists (select 1 from unnest(${cooks.previousPathNames}) as previous where previous like ${`${prefix}%`})`,
    );
    const where = exceptCookId ? and(match, ne(cooks.cookId, exceptCookId)) : match;
    const rows = await db
        .select({ pathName: cooks.pathName, previousPathNames: cooks.previousPathNames, cookId: cooks.cookId })
        .from(cooks)
        .where(where);

    const used = new Set<string>();
    for (const row of rows) {
        used.add(row.pathName);
        used.add(row.cookId);
        for (const previous of row.previousPathNames) used.add(previous);
    }

    for (let index = 1; index <= ALLOCATE_MAX; index += 1) {
        const candidate = cookPathNameCandidate(base, index);
        if (isNanoId(candidate)) continue;
        if (!used.has(candidate)) return candidate;
    }
    throw new Error('cookPathNameAllocate: could not allocate a unique pathName');
}

export async function cookPathNameApply(
    db: CookPathNameDb,
    cook: Pick<Cook, 'cookId' | 'pathName' | 'previousPathNames'>,
    nextPathName: string,
): Promise<{ pathName: string; previousPathNames: string[] }> {
    const pathName = cookPathNameNormalize(nextPathName);
    if (pathName === cook.pathName) {
        return { pathName: cook.pathName, previousPathNames: cook.previousPathNames };
    }
    if (await cookPathNameTaken(db, pathName, cook.cookId)) {
        throw new Error('cookPathNameApply: pathName is taken');
    }
    return {
        pathName,
        previousPathNames: previousPathNamesArchive(cook.previousPathNames, cook.pathName, pathName),
    };
}
