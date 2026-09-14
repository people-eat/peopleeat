import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import type { BookingRequestOfferConfiguredMenu } from '../domain/bookingRequest';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestOfferConfiguredMenuUpdate } from './adminBookingRequestOfferConfiguredMenuUpdate';

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

const existingConfiguredMenu: BookingRequestOfferConfiguredMenu = {
    menuId: 'menu-source-1',
    title: 'Original menu',
    description: 'Original description',
    courses: [
        {
            title: 'Starter',
            meals: [{ mealTitle: 'Soup', mealDescription: 'Tomato', mealImageUrl: 'https://example.com/soup.jpg' }],
        },
    ],
};

async function setupAdminConfiguredMenuUpdate(options?: { withConfiguredMenu?: boolean }) {
    const withConfiguredMenu = options?.withConfiguredMenu ?? true;
    const admin = await commandSetup.withUser({ firstName: 'configured-menu-admin', lastName: 'User' });
    await testDb.insert(admins).values({ adminId: admin.user.userId });

    const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'ConfiguredMenu' });
    await testDb.insert(cooks).values({
        cookId: cook.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
    });

    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'ConfiguredHost' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Birthday',
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        exactEventAddress: berlin,
        priceClassType: 'MEDIUM',
        originalMessage: 'Looking for a chef',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });

    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cook.user.userId,
        cookAccepted: true,
        userAccepted: null,
        menuPriceCents: 20_000,
        travelExpensesCents: 1_000,
        paymentProviderFeeCents: 400,
        platformFeePercentCook: 15,
        platformFeePercentCustomer: 10,
        platformFeeCentsCook: 3_000,
        platformFeeCentsCustomer: 2_140,
        payoutCentsCook: 18_000,
        totalWithoutDiscountsCentsCustomer: 23_540,
        paymentStatus: 'EMPTY',
        configuredMenu: withConfiguredMenu ? existingConfiguredMenu : null,
    });

    return { admin, cook, customer, bookingRequestId, bookingRequestOfferId };
}

describe('adminBookingRequestOfferConfiguredMenuUpdate', () => {
    it('replaces the snapshot while preserving menuId', async () => {
        const { admin, bookingRequestOfferId, customer, cook } = await setupAdminConfiguredMenuUpdate();

        const result = await adminBookingRequestOfferConfiguredMenuUpdate(
            adminMutationParent(admin.user.userId),
            {
                bookingRequestOfferId,
                configuredMenu: {
                    title: '  Updated menu  ',
                    description: '  Updated description  ',
                    courses: [
                        {
                            title: ' Main ',
                            meals: [
                                {
                                    mealTitle: ' Steak ',
                                    mealDescription: ' Medium ',
                                    mealImageUrl: ' https://example.com/steak.jpg ',
                                },
                                {
                                    mealTitle: 'Salad',
                                    mealDescription: '',
                                    mealImageUrl: '',
                                },
                            ],
                        },
                    ],
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: bookingRequestOfferId });

        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

        expect(offer?.configuredMenu).toEqual({
            menuId: 'menu-source-1',
            title: 'Updated menu',
            description: 'Updated description',
            courses: [
                {
                    title: 'Main',
                    meals: [
                        {
                            mealTitle: 'Steak',
                            mealDescription: 'Medium',
                            mealImageUrl: 'https://example.com/steak.jpg',
                        },
                        {
                            mealTitle: 'Salad',
                            mealDescription: '',
                            mealImageUrl: undefined,
                        },
                    ],
                },
            ],
        });

        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('rejects empty title', async () => {
        const { admin, bookingRequestOfferId } = await setupAdminConfiguredMenuUpdate();

        await expect(
            adminBookingRequestOfferConfiguredMenuUpdate(
                adminMutationParent(admin.user.userId),
                {
                    bookingRequestOfferId,
                    configuredMenu: {
                        title: '   ',
                        description: 'x',
                        courses: [{ title: 'Course', meals: [{ mealTitle: 'Meal', mealDescription: '' }] }],
                    },
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/title must not be empty/);
    });

    it('rejects empty courses', async () => {
        const { admin, bookingRequestOfferId } = await setupAdminConfiguredMenuUpdate();

        await expect(
            adminBookingRequestOfferConfiguredMenuUpdate(
                adminMutationParent(admin.user.userId),
                {
                    bookingRequestOfferId,
                    configuredMenu: {
                        title: 'Menu',
                        description: 'x',
                        courses: [],
                    },
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/at least one course is required/);
    });

    it('rejects when configured menu is missing', async () => {
        const { admin, bookingRequestOfferId } = await setupAdminConfiguredMenuUpdate({ withConfiguredMenu: false });

        await expect(
            adminBookingRequestOfferConfiguredMenuUpdate(
                adminMutationParent(admin.user.userId),
                {
                    bookingRequestOfferId,
                    configuredMenu: {
                        title: 'Menu',
                        description: 'x',
                        courses: [{ title: 'Course', meals: [{ mealTitle: 'Meal', mealDescription: '' }] }],
                    },
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/configured menu not found/);
    });

    it('rejects unknown offers', async () => {
        const { admin } = await setupAdminConfiguredMenuUpdate();

        await expect(
            adminBookingRequestOfferConfiguredMenuUpdate(
                adminMutationParent(admin.user.userId),
                {
                    bookingRequestOfferId: idCreate(),
                    configuredMenu: {
                        title: 'Menu',
                        description: 'x',
                        courses: [{ title: 'Course', meals: [{ mealTitle: 'Meal', mealDescription: '' }] }],
                    },
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/offer not found/);
    });

    it('rejects invalid meal image URLs', async () => {
        const { admin, bookingRequestOfferId } = await setupAdminConfiguredMenuUpdate();

        await expect(
            adminBookingRequestOfferConfiguredMenuUpdate(
                adminMutationParent(admin.user.userId),
                {
                    bookingRequestOfferId,
                    configuredMenu: {
                        title: 'Menu',
                        description: 'x',
                        courses: [
                            {
                                title: 'Course',
                                meals: [{ mealTitle: 'Meal', mealDescription: '', mealImageUrl: 'not-a-url' }],
                            },
                        ],
                    },
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/must be a valid URL/);
    });
});
