import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { publicCookFindOneByPathName } from './publicCookFindOneByPathName';

async function insertPublicCook(pathName: string, extras: { previousPathNames?: string[]; isVisible?: boolean } = {}) {
    const setup = await commandSetup.withUser();
    await testDb.insert(cooks).values({
        cookId: setup.user.userId,
        pathName,
        previousPathNames: extras.previousPathNames ?? [],
        isVisible: extras.isVisible ?? true,
        isApprovedByAdmin: true,
    });
    return setup;
}

describe('publicCookFindOneByPathName', () => {
    it('returns the cook for current slug, archived slug, and legacy cookId', async () => {
        const token = idCreate().toLowerCase();
        const current = `chef-${token}`;
        const archived = `old-${token}`;
        const { serverRuntime, user } = await insertPublicCook(current, { previousPathNames: [archived] });

        const byCurrent = await publicCookFindOneByPathName({ pathName: current }, serverRuntime);
        const byPrevious = await publicCookFindOneByPathName({ pathName: archived }, serverRuntime);
        const byId = await publicCookFindOneByPathName({ pathName: user.userId }, serverRuntime);

        expect(byCurrent?.cookId).toBe(user.userId);
        expect(byCurrent?.pathName).toBe(current);
        expect(byPrevious?.cookId).toBe(user.userId);
        expect(byPrevious?.pathName).toBe(current);
        expect(byId?.cookId).toBe(user.userId);
        expect(byId?.pathName).toBe(current);
    });

    it('returns null for missing or non-public cooks', async () => {
        const token = idCreate().toLowerCase();
        const { serverRuntime } = await insertPublicCook(`hidden-${token}`, { isVisible: false });

        expect(await publicCookFindOneByPathName({ pathName: `hidden-${token}` }, serverRuntime)).toBeNull();
        expect(await publicCookFindOneByPathName({ pathName: `missing-${token}` }, serverRuntime)).toBeNull();
    });
});
