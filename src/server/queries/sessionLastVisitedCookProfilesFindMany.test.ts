import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks, fileUploads, meals } from '../db/schema';
import type { MealCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { sessionLastVisitedCookProfilesFindMany } from './sessionLastVisitedCookProfilesFindMany';

async function insertMealImage(cookId: string) {
    const fileUploadId = idCreate();
    await testDb.insert(fileUploads).values({
        fileUploadId,
        userId: cookId,
        filename: 'meal.jpg',
        mediaType: 'image/jpeg',
        size: 3,
        bytes: Buffer.from([1, 2, 3]),
    });
    return fileUploadId;
}

async function insertMeal(cookId: string, overrides: Partial<MealCreate> = {}) {
    const mealId = overrides.mealId ?? idCreate();
    const imageFileUploadId = overrides.imageFileUploadId !== undefined ? overrides.imageFileUploadId : await insertMealImage(cookId);
    await testDb.insert(meals).values({
        mealId,
        cookId,
        title: overrides.title ?? `Meal ${mealId.slice(0, 8)}`,
        description: overrides.description ?? 'Description',
        publishedAt: new Date('2024-01-01T00:00:00.000Z'),
        ...overrides,
        imageFileUploadId,
    });
}

async function insertListedCook(firstName: string) {
    const setup = await commandSetup.withUser({ firstName, lastName: 'Chef' });
    await testDb.insert(cooks).values({
        cookId: setup.user.userId,
        pathName: `chef-${setup.user.userId.toLowerCase()}`,
        isVisible: true,
        isApprovedByAdmin: true,
    });
    await insertMeal(setup.user.userId);
    return setup;
}

async function visitChef(sessionId: string, cookId: string, serverRuntime: Awaited<ReturnType<typeof commandSetup>>['serverRuntime']) {
    await sessionEventCreate(serverRuntime, {
        sessionId,
        type: 'WEB_PAGE_VISITED',
        payload: { webPageKey: 'CHEFS', params: { cookId } },
    });
}

describe('sessionLastVisitedCookProfilesFindMany', () => {
    it('returns the last unique listed cooks in MRU order', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const a = await insertListedCook('Ada');
        const b = await insertListedCook('Bea');
        const c = await insertListedCook('Cia');

        await visitChef(requestingSession.sessionId, a.user.userId, serverRuntime);
        await visitChef(requestingSession.sessionId, b.user.userId, serverRuntime);
        await visitChef(requestingSession.sessionId, a.user.userId, serverRuntime);
        await visitChef(requestingSession.sessionId, c.user.userId, serverRuntime);

        const result = await sessionLastVisitedCookProfilesFindMany({ sessionId: requestingSession.sessionId }, serverRuntime);

        expect(result.map((cook) => cook.cookId)).toEqual([c.user.userId, a.user.userId, b.user.userId]);
    });

    it('skips excludeCookId and unlisted cooks', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const listed = await insertListedCook('Listed');
        const current = await insertListedCook('Current');
        const hidden = await commandSetup.withUser({ firstName: 'Hidden', lastName: 'Chef' });
        await testDb.insert(cooks).values({
            cookId: hidden.user.userId,
            pathName: `hidden-${hidden.user.userId.toLowerCase()}`,
            isVisible: false,
            isApprovedByAdmin: true,
        });
        await insertMeal(hidden.user.userId);

        await visitChef(requestingSession.sessionId, listed.user.userId, serverRuntime);
        await visitChef(requestingSession.sessionId, hidden.user.userId, serverRuntime);
        await visitChef(requestingSession.sessionId, current.user.userId, serverRuntime);

        const result = await sessionLastVisitedCookProfilesFindMany(
            { sessionId: requestingSession.sessionId, excludeCookId: current.user.userId },
            serverRuntime,
        );

        expect(result.map((cook) => cook.cookId)).toEqual([listed.user.userId]);
    });

    it('ignores non-chef page visits and listing visits without cookId', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const cook = await insertListedCook('Only');

        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'WEB_PAGE_VISITED',
            payload: { webPageKey: 'LANDING' },
        });
        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'WEB_PAGE_VISITED',
            payload: { webPageKey: 'CHEFS' },
        });
        await visitChef(requestingSession.sessionId, cook.user.userId, serverRuntime);

        const result = await sessionLastVisitedCookProfilesFindMany({ sessionId: requestingSession.sessionId }, serverRuntime);

        expect(result.map((row) => row.cookId)).toEqual([cook.user.userId]);
    });
});
