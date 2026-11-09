import { describe, expect, it } from 'vitest';

import { cookPathNameFromNames } from '../../shared/cookPathName';
import { idCreate } from '../../shared/idCreate';
import { cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import {
    cookFindByPathNameAny,
    cookPathNameAllocate,
    cookPathNameApply,
    cookPathNameAvailability,
    cookPathNameTaken,
} from './cookPathName';

async function insertCook(pathName: string, extras: { previousPathNames?: string[] } = {}) {
    const setup = await commandSetup.withUser();
    await testDb.insert(cooks).values({
        cookId: setup.user.userId,
        pathName,
        previousPathNames: extras.previousPathNames ?? [],
    });
    return setup;
}

describe('cookPathNameTaken', () => {
    it('treats current slugs, archived slugs, and other cookIds as taken, and allows reclaiming own archive', async () => {
        const token = idCreate().toLowerCase();
        const current = `chef-${token}`;
        const archived = `old-${token}`;
        const owner = await insertCook(current, { previousPathNames: [archived] });
        const other = await commandSetup.withUser();
        await testDb.insert(cooks).values({ cookId: other.user.userId, pathName: `other-${token}` });

        expect(await cookPathNameTaken(testDb, current, other.user.userId)).toBe(true);
        expect(await cookPathNameTaken(testDb, archived, other.user.userId)).toBe(true);
        expect(await cookPathNameTaken(testDb, owner.user.userId, other.user.userId)).toBe(true);
        expect(await cookPathNameTaken(testDb, current, owner.user.userId)).toBe(false);
        expect(await cookPathNameTaken(testDb, archived, owner.user.userId)).toBe(false);
        expect(await cookPathNameTaken(testDb, `free-${token}`)).toBe(false);
    });
});

describe('cookPathNameAvailability', () => {
    it('returns invalid, taken, and available including own current slug', async () => {
        const token = idCreate().toLowerCase();
        const current = `chef-${token}`;
        const owner = await insertCook(current);
        const other = await insertCook(`other-${token}`);

        expect(await cookPathNameAvailability(testDb, '   ')).toBe('INVALID');
        expect(await cookPathNameAvailability(testDb, owner.user.userId)).toBe('INVALID');
        expect(await cookPathNameAvailability(testDb, current, other.user.userId)).toBe('TAKEN');
        expect(await cookPathNameAvailability(testDb, current, owner.user.userId)).toBe('AVAILABLE');
        expect(await cookPathNameAvailability(testDb, `free-${token}`, owner.user.userId)).toBe('AVAILABLE');
    });
});

describe('cookPathNameAllocate', () => {
    it('suffixes collisions and leaves the first owner without a numeric suffix', async () => {
        const lastName = idCreate().slice(0, 8).toLowerCase();
        const base = cookPathNameFromNames('Anna', lastName);
        await insertCook(base);

        expect(await cookPathNameAllocate(testDb, 'Anna', lastName)).toBe(`${base}-2`);
        expect(await cookPathNameAllocate(testDb, 'Unique', lastName)).toBe(cookPathNameFromNames('Unique', lastName));
    });
});

describe('cookPathNameApply', () => {
    it('archives the old slug and reclaims a previous slug', async () => {
        const token = idCreate().toLowerCase();
        const first = `first-${token}`;
        const second = `second-${token}`;
        const owner = await insertCook(first);

        const renamed = await cookPathNameApply(testDb, { cookId: owner.user.userId, pathName: first, previousPathNames: [] }, second);
        expect(renamed).toEqual({ pathName: second, previousPathNames: [first] });

        const reclaimed = await cookPathNameApply(
            testDb,
            { cookId: owner.user.userId, pathName: second, previousPathNames: [first] },
            first,
        );
        expect(reclaimed.pathName).toBe(first);
        expect(reclaimed.previousPathNames).toEqual([second]);
    });

    it('rejects a slug taken by another cook', async () => {
        const token = idCreate().toLowerCase();
        const taken = `taken-${token}`;
        await insertCook(taken);
        const owner = await insertCook(`mine-${token}`);

        await expect(
            cookPathNameApply(testDb, { cookId: owner.user.userId, pathName: `mine-${token}`, previousPathNames: [] }, taken),
        ).rejects.toThrow(/pathName is taken/);
    });
});

describe('cookFindByPathNameAny', () => {
    it('resolves current slug, archived slug, and legacy cookId', async () => {
        const token = idCreate().toLowerCase();
        const current = `chef-${token}`;
        const archived = `old-${token}`;
        const owner = await insertCook(current, { previousPathNames: [archived] });

        expect((await cookFindByPathNameAny(testDb, current))?.cookId).toBe(owner.user.userId);
        expect((await cookFindByPathNameAny(testDb, archived))?.cookId).toBe(owner.user.userId);
        expect((await cookFindByPathNameAny(testDb, owner.user.userId))?.cookId).toBe(owner.user.userId);
        expect(await cookFindByPathNameAny(testDb, `missing-${token}`)).toBeNull();
    });
});
