import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cooks, menuCourseMealOptions, menuCourses, menus } from '../db/schema';
import { commandSetup, cookMutationParent, testDb } from '../test/commandTestUtils';
import { cookMealCreate } from './cookMealCreate';
import { cookMenuCreate } from './cookMenuCreate';
import { cookMenuSyncToTemplate } from './cookMenuSyncToTemplate';
import { cookMenuUpdate } from './cookMenuUpdate';

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

describe('cookMenuSyncToTemplate', () => {
    it('overwrites the inventory template with the offer copy content', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const template = await cookMenuCreate(cookMutationParent(user.userId), requestingSession, serverRuntime);
        const meal = await cookMealCreate(cookMutationParent(user.userId), {}, requestingSession, serverRuntime);
        await cookMenuUpdate(
            cookMutationParent(user.userId),
            {
                menuId: template.referenceId!,
                menu: {
                    title: 'Template title',
                    description: 'Template description',
                    courses: [{ title: 'Starter', mealIds: [meal.referenceId!], mealSelectionLimit: null }],
                },
            },
            requestingSession,
            serverRuntime,
        );

        const customer = await commandSetup.withUser({ firstName: 'customer', lastName: 'User' });
        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: 'Dinner',
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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

        const offerMenuId = idCreate();
        const offerCourseId = idCreate();
        await testDb.insert(menus).values({
            menuId: offerMenuId,
            cookId: user.userId,
            bookingRequestOfferId: offerId,
            copyOfMenuId: template.referenceId!,
            title: 'Offer customized',
            description: 'For this guest',
        });
        await testDb.insert(menuCourses).values({
            courseId: offerCourseId,
            menuId: offerMenuId,
            cookId: user.userId,
            index: 0,
            title: 'Amuse',
            mealSelectionLimit: null,
        });
        await testDb.insert(menuCourseMealOptions).values({
            mealOptionId: idCreate(),
            courseId: offerCourseId,
            cookId: user.userId,
            mealId: meal.referenceId!,
            index: 0,
        });
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();

        // Act
        const result = await cookMenuSyncToTemplate(
            cookMutationParent(user.userId),
            { menuId: offerMenuId },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: template.referenceId });
        const [templateRow] = await testDb.select().from(menus).where(eq(menus.menuId, template.referenceId!));
        expect(templateRow!.title).toBe('Offer customized');
        expect(templateRow!.description).toBe('For this guest');
        const courses = await testDb.select().from(menuCourses).where(eq(menuCourses.menuId, template.referenceId!));
        expect(courses).toHaveLength(1);
        expect(courses[0]!.title).toBe('Amuse');
        const options = await testDb.select().from(menuCourseMealOptions).where(eq(menuCourseMealOptions.courseId, courses[0]!.courseId));
        expect(options).toHaveLength(1);
        expect(options[0]!.mealId).toBe(meal.referenceId);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    }, 15_000);

    it('rejects when the template is soft-deleted', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const template = await cookMenuCreate(cookMutationParent(user.userId), requestingSession, serverRuntime);
        const customer = await commandSetup.withUser({ firstName: 'customer', lastName: 'User' });
        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: 'Dinner',
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
        const menuId = idCreate();
        await testDb.insert(menus).values({
            menuId,
            cookId: user.userId,
            bookingRequestOfferId: offerId,
            copyOfMenuId: template.referenceId!,
            title: 'Offer menu',
            description: '',
        });
        await testDb.update(menus).set({ deletedAt: new Date() }).where(eq(menus.menuId, template.referenceId!));
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();

        // Act + Assert
        await expect(cookMenuSyncToTemplate(cookMutationParent(user.userId), { menuId }, requestingSession, serverRuntime)).rejects.toThrow(
            /template not found/,
        );

        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });
});
