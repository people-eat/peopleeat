import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cooks, meals } from '../db/schema';
import type { CookTravelOriginAddress } from '../domain/cook';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookAssistantStateSnapshotRead } from './cookAssistantStateSnapshotRead';

function address(city: string): CookTravelOriginAddress {
    return {
        displayText: city,
        latitude: 52.52,
        longitude: 13.405,
        addressLine1: 'Street 1',
        addressLine2: '',
        city,
        postCode: '10115',
        state: 'BE',
        country: 'DE',
    };
}

describe('cookAssistantStateSnapshotRead', () => {
    it('maps cook columns and returns no meals when the cook has none', async () => {
        // Arrange
        const { serverRuntime, user } = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Lovelace' });
        await testDb.insert(cooks).values({
            cookId: user.userId,
            isVisible: true,
            isApprovedByAdmin: true,
            biography: 'Bio',
            biographySummary: 'Short bio',
            cuisineStyle: 'Italian',
            cookingPhilosophy: 'Seasonal',
            travelExpensesAmount: 40,
            maximumTravelDistance: 80,
            minimumPriceAmount: 100,
            maximumPriceAmount: 500,
            minimumParticipants: 2,
            maximumParticipants: 12,
            callSchedulingEnabled: true,
            callDurationMinutes: 45,
            exactTravelOriginAddress: address('Leipzig'),
        });

        // Act
        const result = await cookAssistantStateSnapshotRead(serverRuntime, user.userId);

        // Assert
        expect(result).toEqual({
            cookId: user.userId,
            firstName: 'Ada',
            lastName: 'Lovelace',
            emailAddress: user.emailAddress,
            isVisible: true,
            isApprovedByAdmin: true,
            biography: 'Bio',
            biographySummary: 'Short bio',
            cuisineStyle: 'Italian',
            cookingPhilosophy: 'Seasonal',
            travelExpensesAmount: 40,
            maximumTravelDistance: 80,
            minimumPriceAmount: 100,
            maximumPriceAmount: 500,
            minimumParticipants: 2,
            maximumParticipants: 12,
            callSchedulingEnabled: true,
            callDurationMinutes: 45,
            travelOriginCity: 'Leipzig',
            mealCount: 0,
            meals: [],
        });
    });

    it('orders meals by createdAt, skips deleted meals, truncates long descriptions, and caps at 40', async () => {
        // Arrange
        const { serverRuntime, user } = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        await testDb.insert(cooks).values([{ cookId: user.userId }, { cookId: other.user.userId }]);
        const base = Date.parse('2026-01-01T00:00:00.000Z');
        const keptIds = Array.from({ length: 41 }, () => idCreate());
        await testDb.insert(meals).values([
            {
                mealId: idCreate(),
                cookId: user.userId,
                title: 'deleted',
                description: 'gone',
                deletedAt: new Date('2026-03-01T00:00:00.000Z'),
                createdAt: new Date(base),
            },
            {
                mealId: idCreate(),
                cookId: other.user.userId,
                title: 'other-cook',
                description: 'not mine',
                createdAt: new Date(base + 1),
            },
            ...keptIds.map((mealId, index) => ({
                mealId,
                cookId: user.userId,
                title: `meal-${index}`,
                description: index === 0 ? 'y'.repeat(181) : index === 1 ? 'x'.repeat(180) : 'short',
                publishedAt: index === 1 ? null : new Date('2026-02-01T00:00:00.000Z'),
                createdAt: new Date(base + (index + 1) * 60_000),
            })),
        ]);

        // Act
        const result = await cookAssistantStateSnapshotRead(serverRuntime, user.userId);

        // Assert
        expect(result?.mealCount).toBe(40);
        expect(result?.meals.map((meal) => meal.mealId)).toEqual(keptIds.slice(0, 40));
        expect(result?.meals[0]).toEqual({
            mealId: keptIds[0],
            title: 'meal-0',
            description: `${'y'.repeat(177)}…`,
            isPublished: true,
        });
        expect(result?.meals[1]).toEqual({
            mealId: keptIds[1],
            title: 'meal-1',
            description: 'x'.repeat(180),
            isPublished: false,
        });
        expect(result?.meals[2]).toMatchObject({ title: 'meal-2', description: 'short', isPublished: true });
        expect(result?.meals.some((meal) => meal.title === 'deleted' || meal.title === 'other-cook' || meal.title === 'meal-40')).toBe(
            false,
        );
        expect(result?.travelOriginCity).toBeNull();
    });

    it('returns null travelOriginCity when the address city is not a string', async () => {
        // Arrange
        const { serverRuntime, user } = await commandSetup.withUser({ firstName: 'City', lastName: 'Missing' });
        await testDb.insert(cooks).values({
            cookId: user.userId,
            exactTravelOriginAddress: { ...address('Berlin'), city: 12 } as never,
        });

        // Act
        const result = await cookAssistantStateSnapshotRead(serverRuntime, user.userId);

        // Assert
        expect(result).toMatchObject({
            cookId: user.userId,
            firstName: 'City',
            lastName: 'Missing',
            travelOriginCity: null,
            mealCount: 0,
            meals: [],
            biography: '',
            biographySummary: '',
            isVisible: false,
            isApprovedByAdmin: false,
            travelExpensesAmount: 25,
            callDurationMinutes: 30,
            callSchedulingEnabled: false,
        });
    });

    it('returns null for an unknown cook id', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup.withUser();

        // Act
        const result = await cookAssistantStateSnapshotRead(serverRuntime, idCreate());

        // Assert
        expect(result).toBeNull();
    });
});
