import { describe, expect, it } from 'vitest';

import { cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminMapCookPointsFindMany } from './adminMapCookPointsFindMany';
import { adminMapCooksMissingOriginCount } from './adminMapCooksMissingOriginCount';

const origin = {
    displayText: 'Berlin',
    latitude: 52.52,
    longitude: 13.405,
    addressLine1: 'Street 1',
    addressLine2: '',
    city: 'Berlin',
    postCode: '10115',
    state: 'BE',
    country: 'DE',
};

describe('adminMapCookPointsFindMany', () => {
    it('maps listable cooks and prefers a stage name', async () => {
        // Arrange
        const cook = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Cook' });
        await testDb.insert(cooks).values({
            cookId: cook.user.userId,
            stageName: 'Stage Ada',
            isVisible: true,
            isApprovedByAdmin: true,
            maximumTravelDistance: 42,
            exactTravelOriginAddress: { ...origin, latitude: 52.11, longitude: 13.11 },
        });

        // Act
        const points = await adminMapCookPointsFindMany(cook.serverRuntime);

        // Assert
        expect(points.find((point) => point.cookId === cook.user.userId)).toMatchObject({
            latitude: 52.11,
            longitude: 13.11,
            displayName: 'Stage Ada',
            maximumTravelDistance: 42,
            mapStatus: 'LISTABLE',
        });
    });

    it('falls back to the first name when the stage name is blank', async () => {
        // Arrange
        const cook = await commandSetup.withUser({ firstName: 'Grace', lastName: 'Cook' });
        await testDb.insert(cooks).values({
            cookId: cook.user.userId,
            stageName: '   ',
            isVisible: true,
            isApprovedByAdmin: true,
            exactTravelOriginAddress: origin,
        });

        // Act
        const points = await adminMapCookPointsFindMany(cook.serverRuntime);

        // Assert
        expect(points.find((point) => point.cookId === cook.user.userId)).toMatchObject({
            displayName: 'Grace',
            maximumTravelDistance: null,
            mapStatus: 'LISTABLE',
        });
    });

    it('marks unapproved cooks pending and invisible or inactive cooks hidden', async () => {
        // Arrange
        const pending = await commandSetup.withUser({ firstName: 'Pending', lastName: 'Cook' });
        const hidden = await commandSetup.withUser({ firstName: 'Hidden', lastName: 'Cook' });
        const banned = await commandSetup.withUser({ firstName: 'Banned', lastName: 'Cook', status: 'BANNED' });
        await testDb.insert(cooks).values([
            {
                cookId: pending.user.userId,
                isVisible: true,
                isApprovedByAdmin: false,
                exactTravelOriginAddress: origin,
            },
            {
                cookId: hidden.user.userId,
                isVisible: false,
                isApprovedByAdmin: true,
                exactTravelOriginAddress: origin,
            },
            {
                cookId: banned.user.userId,
                isVisible: true,
                isApprovedByAdmin: true,
                exactTravelOriginAddress: origin,
            },
        ]);

        // Act
        const points = await adminMapCookPointsFindMany(pending.serverRuntime);

        // Assert
        const byId = new Map(points.map((point) => [point.cookId, point]));
        expect(byId.get(pending.user.userId)?.mapStatus).toBe('PENDING');
        expect(byId.get(hidden.user.userId)?.mapStatus).toBe('HIDDEN');
        expect(byId.get(banned.user.userId)?.mapStatus).toBe('HIDDEN');
    });

    it('omits cooks that have no travel origin', async () => {
        // Arrange
        const cook = await commandSetup.withUser({ firstName: 'Nowhere', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId, isVisible: true, isApprovedByAdmin: true });

        // Act
        const points = await adminMapCookPointsFindMany(cook.serverRuntime);

        // Assert
        expect(points.some((point) => point.cookId === cook.user.userId)).toBe(false);
    });
});

describe('adminMapCooksMissingOriginCount', () => {
    it('counts cooks that have no travel origin', async () => {
        // Arrange
        const cook = await commandSetup.withUser({ firstName: 'Missing', lastName: 'Origin' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });

        // Act
        const missing = await adminMapCooksMissingOriginCount(cook.serverRuntime);

        // Assert
        expect(missing).toBeGreaterThanOrEqual(1);
    });
});
