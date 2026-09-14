import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cookMealCreate } from '../commands/cookMealCreate';
import { cookMenuCreate } from '../commands/cookMenuCreate';
import { cookMenuUpdate } from '../commands/cookMenuUpdate';
import { bookingRequestOffers, bookingRequests, cooks, meals, menus } from '../db/schema';
import { commandSetup, cookMutationParent, testDb } from '../test/commandTestUtils';
import { menuDeepCopyInsert } from '../utils/menuDeepCopyInsert';
import { cookMealRelationshipsFind } from './cookMealRelationshipsFind';

const berlin = {
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

async function setupCook() {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

describe('cookMealRelationshipsFind', () => {
    it('blocks deletion when the meal is the sole option on an inventory menu course', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const meal = await cookMealCreate(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        const menu = await cookMenuCreate(cookMutationParent(user.userId), requestingSession, serverRuntime);
        await cookMenuUpdate(
            cookMutationParent(user.userId),
            {
                menuId: menu.referenceId!,
                menu: {
                    title: 'Tasting',
                    courses: [{ title: 'Amuse', mealIds: [meal.referenceId!], mealSelectionLimit: null }],
                },
            },
            requestingSession,
            serverRuntime,
        );

        // Act
        const result = await cookMealRelationshipsFind(meal.referenceId!, requestingSession, serverRuntime);

        // Assert
        expect(result.deletionBlockedByRelationships).toBe(true);
        expect(result.menus).toEqual([
            {
                menuId: menu.referenceId,
                menuTitle: 'Tasting',
                courseTitle: 'Amuse',
                blocksDeletion: true,
            },
        ]);
        expect(result.offers).toEqual([]);
    });

    it('does not block deletion when the course has another active meal option', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const mealA = await cookMealCreate(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        const mealB = await cookMealCreate(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        const menu = await cookMenuCreate(cookMutationParent(user.userId), requestingSession, serverRuntime);
        await cookMenuUpdate(
            cookMutationParent(user.userId),
            {
                menuId: menu.referenceId!,
                menu: {
                    title: 'Tasting',
                    courses: [
                        {
                            title: 'Haupt',
                            mealIds: [mealA.referenceId!, mealB.referenceId!],
                            mealSelectionLimit: 2,
                        },
                    ],
                },
            },
            requestingSession,
            serverRuntime,
        );

        // Act
        const result = await cookMealRelationshipsFind(mealA.referenceId!, requestingSession, serverRuntime);

        // Assert
        expect(result.deletionBlockedByRelationships).toBe(false);
        expect(result.menus).toEqual([
            {
                menuId: menu.referenceId,
                menuTitle: 'Tasting',
                courseTitle: 'Haupt',
                blocksDeletion: false,
            },
        ]);
    });

    it('puts offer-copied menus under offers with customer name and dateTime', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const meal = await cookMealCreate(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        const inventory = await cookMenuCreate(cookMutationParent(user.userId), requestingSession, serverRuntime);
        await cookMenuUpdate(
            cookMutationParent(user.userId),
            {
                menuId: inventory.referenceId!,
                menu: {
                    title: 'Offer tasting',
                    courses: [{ title: 'Vorspeise', mealIds: [meal.referenceId!], mealSelectionLimit: null }],
                },
            },
            requestingSession,
            serverRuntime,
        );

        const customer = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Customer' });
        const bookingRequestId = idCreate();
        const dateTime = new Date('2026-06-01T18:00:00.000Z');
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: 'Dinner',
            dateTime,
            exactEventAddress: berlin,
            priceClassType: 'MEDIUM',
            originalMessage: 'Hi',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        const offerId = idCreate();
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: offerId,
            bookingRequestId,
            cookId: user.userId,
            cookAccepted: true,
            userAccepted: null,
            menuPriceCents: 20_000,
            travelExpensesCents: 2_500,
            paymentProviderFeeCents: 500,
            platformFeePercentCook: 18,
            platformFeePercentCustomer: 0,
            platformFeeCentsCook: 3_600,
            platformFeeCentsCustomer: 0,
            payoutCentsCook: 18_400,
            totalWithoutDiscountsCentsCustomer: 23_000,
            paymentStatus: 'EMPTY',
        });
        await menuDeepCopyInsert(testDb, {
            cookId: user.userId,
            sourceMenuId: inventory.referenceId!,
            bookingRequestOfferId: offerId,
        });
        // Soft-delete inventory so only the offer copy remains for this meal.
        await testDb.update(menus).set({ deletedAt: new Date() }).where(eq(menus.menuId, inventory.referenceId!));

        // Act
        const result = await cookMealRelationshipsFind(meal.referenceId!, requestingSession, serverRuntime);

        // Assert
        expect(result.menus).toEqual([]);
        expect(result.deletionBlockedByRelationships).toBe(true);
        expect(result.offers).toEqual([
            {
                bookingRequestOfferId: offerId,
                bookingRequestUserName: 'Ada',
                bookingRequestDateTime: dateTime,
                menuTitle: 'Offer tasting',
                courseTitle: 'Vorspeise',
                blocksDeletion: true,
            },
        ]);
    });

    it('omits soft-deleted inventory menus from relationships', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const meal = await cookMealCreate(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        const menu = await cookMenuCreate(cookMutationParent(user.userId), requestingSession, serverRuntime);
        await cookMenuUpdate(
            cookMutationParent(user.userId),
            {
                menuId: menu.referenceId!,
                menu: {
                    title: 'Gone',
                    courses: [{ title: 'Amuse', mealIds: [meal.referenceId!], mealSelectionLimit: null }],
                },
            },
            requestingSession,
            serverRuntime,
        );
        await testDb.update(menus).set({ deletedAt: new Date() }).where(eq(menus.menuId, menu.referenceId!));

        // Act
        const result = await cookMealRelationshipsFind(meal.referenceId!, requestingSession, serverRuntime);

        // Assert
        expect(result).toEqual({
            menus: [],
            offers: [],
            deletionBlockedByRelationships: false,
        });
    });

    it('treats a sibling soft-deleted meal as absent when counting options', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const mealA = await cookMealCreate(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        const mealB = await cookMealCreate(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        const menu = await cookMenuCreate(cookMutationParent(user.userId), requestingSession, serverRuntime);
        await cookMenuUpdate(
            cookMutationParent(user.userId),
            {
                menuId: menu.referenceId!,
                menu: {
                    title: 'Tasting',
                    courses: [
                        {
                            title: 'Haupt',
                            mealIds: [mealA.referenceId!, mealB.referenceId!],
                            mealSelectionLimit: 2,
                        },
                    ],
                },
            },
            requestingSession,
            serverRuntime,
        );
        await testDb.update(meals).set({ deletedAt: new Date() }).where(eq(meals.mealId, mealB.referenceId!));

        // Act
        const result = await cookMealRelationshipsFind(mealA.referenceId!, requestingSession, serverRuntime);

        // Assert — only mealA remains active on the course → blocks.
        expect(result.deletionBlockedByRelationships).toBe(true);
        expect(result.menus[0]?.blocksDeletion).toBe(true);
    });
});
