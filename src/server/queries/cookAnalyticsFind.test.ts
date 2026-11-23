import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { chefsDiscoveryArea, chefsDiscoveryMealOpenKey, chefsDiscoveryMenuOpenKey } from '../../shared/chefsDiscovery';
import { idCreate } from '../../shared/idCreate';
import {
    bookingRequestCooks,
    bookingRequestOffers,
    bookingRequests,
    cookOfferAddons,
    cooks,
    meals,
    menuCourseMealOptions,
    menuCourses,
    menus,
    sessions,
} from '../db/schema';
import type { CookCreate } from '../db/schema';
import { toGqlCook } from '../mappers/toGqlCook';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { cookAnalyticsFind } from './cookAnalyticsFind';

vi.mock('../utils/featureToggleIsEnabled', () => ({
    featureToggleIsEnabled: vi.fn(async () => false),
}));

async function setupCook(overrides: Partial<CookCreate> = {}) {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId, ...overrides });
    const [row] = await testDb.select().from(cooks).where(eq(cooks.cookId, setup.user.userId));
    return { ...setup, cook: toGqlCook(row!, 'ACTIVE') };
}

describe('cookAnalyticsFind', () => {
    beforeEach(() => {
        vi.mocked(featureToggleIsEnabled).mockReset();
        vi.mocked(featureToggleIsEnabled).mockResolvedValue(true);
    });

    it('returns null when COOK_ANALYTICS is disabled', async () => {
        const { requestingSession, serverRuntime, cook } = await setupCook();
        vi.mocked(featureToggleIsEnabled).mockResolvedValue(false);

        await expect(cookAnalyticsFind(cook, { period: 'PAST_MONTH' }, requestingSession, serverRuntime)).resolves.toBeNull();
        expect(featureToggleIsEnabled).toHaveBeenCalledWith('COOK_ANALYTICS', serverRuntime, cook.cookId);
    });

    it('returns empty period metrics and hasInsights false for a brand-new cook', async () => {
        const { requestingSession, serverRuntime, cook } = await setupCook();

        const result = await cookAnalyticsFind(cook, { period: 'PAST_WEEK' }, requestingSession, serverRuntime);

        expect(result).toMatchObject({
            period: 'PAST_WEEK',
            channel: 'ALL',
            hasInsights: false,
            publicProfileViewCount: 0,
            requestsNotifiedCount: 0,
            requestsOpenedCount: 0,
            requestsDeclinedCount: 0,
            openRate: null,
            declineRate: null,
            offerCreateRate: null,
            medianNotifyToOpenMinutes: null,
            medianNotifyToOfferMinutes: null,
            offersCreatedCount: 0,
            offersAcceptedCount: 0,
            offerConversionRate: null,
            offersPaidCount: 0,
            paidPayoutCentsCookTotal: 0,
            averageMenuPriceCents: null,
            averageParticipants: null,
            topMenus: [],
            topMeals: [],
            topAddons: [],
        });
        expect(result?.range.startDateTime).toBeTruthy();
        expect(result?.range.endDateTime).toBeTruthy();
        expect(result?.funnels).toHaveLength(2);
        expect(result?.funnels.map((funnel) => funnel.channel)).toEqual(['DIRECT', 'POOL']);
        expect(result?.trend.length).toBeGreaterThan(0);
        expect(result?.trend.every((point) => point.publicProfileViewCount === 0)).toBe(true);
    });

    it('returns a single funnel when channel is DIRECT', async () => {
        const { requestingSession, serverRuntime, cook } = await setupCook();

        const result = await cookAnalyticsFind(cook, { period: 'PAST_MONTH', channel: 'DIRECT' }, requestingSession, serverRuntime);

        expect(result?.channel).toBe('DIRECT');
        expect(result?.funnels).toHaveLength(1);
        expect(result?.funnels[0]?.channel).toBe('DIRECT');
    });

    it('ranks menus, meals, and addons from chef-page opens and accepted offers', async () => {
        const { requestingSession, serverRuntime, cook } = await setupCook();
        const cookId = cook.cookId;
        const visitor = await commandSetup();
        const botVisitor = await commandSetup();
        await testDb.update(sessions).set({ isBot: true }).where(eq(sessions.sessionId, botVisitor.requestingSession.sessionId));

        const customer = await commandSetup.withUser({ firstName: 'Host', lastName: 'Customer' });
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

        const inventoryMenuId = idCreate();
        const ignoredMenuId = idCreate();
        const mealWithId = idCreate();
        const mealTitleOnly = idCreate();
        const libraryAddonId = idCreate();
        await testDb.insert(menus).values([
            { menuId: inventoryMenuId, cookId, title: 'Sunday lunch', description: 'Seasonal' },
            { menuId: ignoredMenuId, cookId, title: 'Never chosen', description: 'Unused' },
        ]);
        await testDb.insert(meals).values([
            { mealId: mealWithId, cookId, title: 'Steak', description: 'Rare' },
            { mealId: mealTitleOnly, cookId, title: 'Soup', description: 'Tomato' },
        ]);
        await testDb.insert(cookOfferAddons).values({
            cookOfferAddonId: libraryAddonId,
            cookId,
            title: 'Cheese board',
            description: 'After dinner',
            pricingUnit: 'FLAT',
            priceCents: 2500,
            inclusion: 'OPTIONAL',
        });

        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            requestedCookId: cookId,
            occasion: 'Birthday',
            dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            priceClassType: 'MEDIUM',
            originalMessage: 'Hi',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        await testDb.insert(bookingRequestCooks).values({
            cookId,
            bookingRequestId,
            requestedMenuId: inventoryMenuId,
            notifiedAt: new Date(),
        });

        const offerId = idCreate();
        const offerMenuId = idCreate();
        const adHocOfferId = idCreate();
        const adHocMenuId = idCreate();
        const adHocRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId: adHocRequestId,
            userId: customer.user.userId,
            occasion: 'Lunch',
            dateTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
            exactEventAddress: berlin,
            priceClassType: 'MEDIUM',
            originalMessage: 'Pool',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });

        const offerValues = {
            cookAccepted: true,
            userAccepted: true,
            menuPriceCents: 20_000,
            travelExpensesCents: 2_500,
            paymentProviderFeeCents: 500,
            platformFeePercentCook: 18,
            platformFeePercentCustomer: 0,
            platformFeeCentsCook: 3_600,
            platformFeeCentsCustomer: 0,
            payoutCentsCook: 18_400,
            totalWithoutDiscountsCentsCustomer: 23_000,
            paymentStatus: 'PAYED' as const,
            paymentDateTime: new Date(),
        };
        await testDb.insert(bookingRequestOffers).values([
            {
                bookingRequestOfferId: offerId,
                bookingRequestId,
                cookId,
                ...offerValues,
                configuredMenu: {
                    menuId: offerMenuId,
                    title: 'Sunday lunch',
                    description: 'Seasonal',
                    courses: [
                        {
                            title: 'Main',
                            meals: [{ mealId: mealWithId, mealTitle: 'Steak', mealDescription: 'Rare' }],
                        },
                        {
                            title: 'Starter',
                            meals: [{ mealTitle: 'Soup', mealDescription: 'Tomato' }],
                        },
                    ],
                },
            },
            {
                bookingRequestOfferId: adHocOfferId,
                bookingRequestId: adHocRequestId,
                cookId,
                ...offerValues,
                configuredMenu: {
                    menuId: adHocMenuId,
                    title: 'Custom tasting',
                    description: 'Off the cuff',
                    courses: [],
                },
            },
        ]);
        await testDb.insert(menus).values([
            {
                menuId: offerMenuId,
                cookId,
                bookingRequestOfferId: offerId,
                copyOfMenuId: inventoryMenuId,
                title: 'Sunday lunch',
                description: 'Seasonal',
            },
            {
                menuId: adHocMenuId,
                cookId,
                bookingRequestOfferId: adHocOfferId,
                title: 'Custom tasting',
                description: 'Off the cuff',
            },
        ]);
        const starterCourseId = idCreate();
        await testDb.insert(menuCourses).values({
            courseId: starterCourseId,
            menuId: offerMenuId,
            cookId,
            index: 0,
            title: 'Starter',
        });
        await testDb.insert(menuCourseMealOptions).values({
            mealOptionId: idCreate(),
            courseId: starterCourseId,
            cookId,
            mealId: mealTitleOnly,
            index: 0,
        });
        await testDb.insert(cookOfferAddons).values({
            cookOfferAddonId: idCreate(),
            cookId,
            bookingRequestOfferId: offerId,
            copyOfCookOfferAddonId: libraryAddonId,
            title: 'Cheese board',
            description: 'After dinner',
            pricingUnit: 'FLAT',
            priceCents: 2500,
            inclusion: 'OPTIONAL',
            customerSelected: true,
        });

        async function trackOpen(sessionId: string, interaction: { key: string; menuId?: string; mealId?: string }) {
            await sessionEventCreate(serverRuntime, {
                sessionId,
                type: 'WEB_PAGE_INTERACTION',
                payload: {
                    webPageKey: 'CHEFS',
                    area: chefsDiscoveryArea,
                    interaction: { type: 'click', cookId, ...interaction },
                },
            });
        }
        await trackOpen(visitor.requestingSession.sessionId, { key: chefsDiscoveryMenuOpenKey, menuId: inventoryMenuId });
        await trackOpen(visitor.requestingSession.sessionId, { key: chefsDiscoveryMenuOpenKey, menuId: inventoryMenuId });
        await trackOpen(visitor.requestingSession.sessionId, { key: chefsDiscoveryMealOpenKey, mealId: mealWithId });
        await trackOpen(botVisitor.requestingSession.sessionId, { key: chefsDiscoveryMealOpenKey, mealId: mealWithId });

        const all = await cookAnalyticsFind(cook, { period: 'PAST_MONTH', channel: 'ALL' }, requestingSession, serverRuntime);
        expect(all?.topMenus).toEqual([
            {
                id: inventoryMenuId,
                title: 'Sunday lunch',
                publicOpenCount: 2,
                requestedCount: 1,
                offeredCount: 0,
                selectedCount: 1,
                paidCount: 1,
            },
        ]);
        expect(all?.topMeals).toEqual([
            {
                id: mealWithId,
                title: 'Steak',
                publicOpenCount: 1,
                requestedCount: 0,
                offeredCount: 0,
                selectedCount: 1,
                paidCount: 1,
            },
            {
                id: mealTitleOnly,
                title: 'Soup',
                publicOpenCount: 0,
                requestedCount: 0,
                offeredCount: 0,
                selectedCount: 1,
                paidCount: 1,
            },
        ]);
        expect(all?.topAddons).toEqual([
            {
                id: libraryAddonId,
                title: 'Cheese board',
                publicOpenCount: 0,
                requestedCount: 0,
                offeredCount: 1,
                selectedCount: 1,
                paidCount: 1,
            },
        ]);

        const pool = await cookAnalyticsFind(cook, { period: 'PAST_MONTH', channel: 'POOL' }, requestingSession, serverRuntime);
        expect(pool?.topMenus).toEqual([
            {
                id: inventoryMenuId,
                title: 'Sunday lunch',
                publicOpenCount: 2,
                requestedCount: 0,
                offeredCount: 0,
                selectedCount: 0,
                paidCount: 0,
            },
        ]);
        expect(pool?.topMeals[0]).toMatchObject({ id: mealWithId, publicOpenCount: 1, selectedCount: 0, paidCount: 0 });
        expect(pool?.topAddons).toEqual([]);
    });
});
