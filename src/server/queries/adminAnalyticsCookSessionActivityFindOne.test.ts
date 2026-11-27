import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, bookingRequestOffers, bookingRequests, cooks, sessions } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminAnalyticsCookSessionActivityFindOne } from './adminAnalyticsCookSessionActivityFindOne';

function activityWindow() {
    const year = 2800 + Math.floor(Math.random() * 1199);
    const month = Math.floor(Math.random() * 10);
    return {
        range: {
            startDateTime: new Date(Date.UTC(year, month, 1)),
            endDateTime: new Date(Date.UTC(year, month + 3, 0, 23, 59, 59, 999)),
        },
        firstMonthAt: new Date(Date.UTC(year, month, 15, 12)),
        secondMonthAt: new Date(Date.UTC(year, month + 1, 15, 12)),
    };
}

describe('adminAnalyticsCookSessionActivityFindOne', () => {
    it('counts a cook whose session lastInteractionAt is in range and zero-fills empty months', async () => {
        const viewer = await commandSetup.withUser();
        const window = activityWindow();
        const cook = await commandSetup.withUser({ firstName: 'Cook', lastName: 'Active' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        await testDb.insert(sessions).values({
            sessionId: idCreate(),
            userId: cook.user.userId,
            lastInteractionAt: window.firstMonthAt,
        });

        const activity = await adminAnalyticsCookSessionActivityFindOne(window.range, viewer.requestingSession, viewer.serverRuntime);

        expect(activity.cookCount).toBe(1);
        expect(activity.monthBuckets).toHaveLength(3);
        expect(activity.monthBuckets[0]?.count).toBe(1);
        expect(activity.monthBuckets[1]?.count).toBe(0);
        expect(activity.monthBuckets[2]?.count).toBe(0);
        expect(activity.weekBuckets.length).toBeGreaterThan(0);
        expect(activity.weekBuckets.some((bucket) => bucket.count === 1)).toBe(true);
        expect(activity.weekBuckets.filter((bucket) => bucket.count > 0)).toHaveLength(1);
    });

    it('counts one cook across two months when they have a session in each, and excludes bots, impersonation, admins, and non-cooks', async () => {
        const viewer = await commandSetup.withUser();
        const window = activityWindow();
        const cook = await commandSetup.withUser({ firstName: 'Cook', lastName: 'TwoMonths' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        await testDb.insert(sessions).values([
            {
                sessionId: idCreate(),
                userId: cook.user.userId,
                lastInteractionAt: window.firstMonthAt,
            },
            {
                sessionId: idCreate(),
                userId: cook.user.userId,
                lastInteractionAt: window.secondMonthAt,
            },
        ]);

        const botCook = await commandSetup.withUser({ firstName: 'Bot', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: botCook.user.userId });
        await testDb.insert(sessions).values({
            sessionId: idCreate(),
            userId: botCook.user.userId,
            lastInteractionAt: window.firstMonthAt,
            isBot: true,
        });

        const impersonatedCook = await commandSetup.withUser({ firstName: 'Impersonated', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: impersonatedCook.user.userId });
        await testDb.insert(sessions).values({
            sessionId: idCreate(),
            userId: impersonatedCook.user.userId,
            lastInteractionAt: window.firstMonthAt,
            impersonationReturnSessionId: viewer.requestingSession.sessionId,
        });

        const adminCook = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: adminCook.user.userId });
        await testDb.insert(admins).values({ adminId: adminCook.user.userId });
        await testDb.insert(sessions).values({
            sessionId: idCreate(),
            userId: adminCook.user.userId,
            lastInteractionAt: window.firstMonthAt,
        });

        const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Only' });
        await testDb.insert(sessions).values({
            sessionId: idCreate(),
            userId: customer.user.userId,
            lastInteractionAt: window.firstMonthAt,
        });

        const activity = await adminAnalyticsCookSessionActivityFindOne(window.range, viewer.requestingSession, viewer.serverRuntime);

        expect(activity.cookCount).toBe(1);
        expect(activity.monthBuckets[0]?.count).toBe(1);
        expect(activity.monthBuckets[1]?.count).toBe(1);
        expect(activity.monthBuckets[2]?.count).toBe(0);
    });

    it('counts productive cooks who created an offer in range and excludes admin cooks', async () => {
        const viewer = await commandSetup.withUser();
        const window = activityWindow();
        const cook = await commandSetup.withUser({ firstName: 'Cook', lastName: 'Offer' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        const customer = await commandSetup.withUser({ firstName: 'Guest', lastName: 'Host' });
        const bookingRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId,
            userId: customer.user.userId,
            occasion: 'Birthday',
            dateTime: new Date(window.firstMonthAt.getTime() + 7 * 24 * 60 * 60 * 1000),
            exactEventAddress: {
                displayText: 'Berlin',
                latitude: 52.52,
                longitude: 13.405,
                addressLine1: 'Street 1',
                addressLine2: '',
                city: 'Berlin',
                postCode: '10115',
                state: 'BE',
                country: 'DE',
            },
            priceClassType: 'MEDIUM',
            originalMessage: 'Looking for a chef',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: idCreate(),
            bookingRequestId,
            cookId: cook.user.userId,
            menuPriceCents: 5000,
            travelExpensesCents: 0,
            paymentProviderFeeCents: 0,
            platformFeePercentCook: 10,
            platformFeePercentCustomer: 10,
            platformFeeCentsCook: 500,
            platformFeeCentsCustomer: 500,
            payoutCentsCook: 4500,
            totalWithoutDiscountsCentsCustomer: 5500,
            createdAt: window.firstMonthAt,
        });

        const adminCook = await commandSetup.withUser({ firstName: 'Admin', lastName: 'CookOffer' });
        await testDb.insert(cooks).values({ cookId: adminCook.user.userId });
        await testDb.insert(admins).values({ adminId: adminCook.user.userId });
        const adminRequestId = idCreate();
        await testDb.insert(bookingRequests).values({
            bookingRequestId: adminRequestId,
            userId: customer.user.userId,
            occasion: 'Birthday',
            dateTime: new Date(window.firstMonthAt.getTime() + 8 * 24 * 60 * 60 * 1000),
            exactEventAddress: {
                displayText: 'Berlin',
                latitude: 52.52,
                longitude: 13.405,
                addressLine1: 'Street 1',
                addressLine2: '',
                city: 'Berlin',
                postCode: '10115',
                state: 'BE',
                country: 'DE',
            },
            priceClassType: 'MEDIUM',
            originalMessage: 'Admin cook offer',
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
            preferences: [],
        });
        await testDb.insert(bookingRequestOffers).values({
            bookingRequestOfferId: idCreate(),
            bookingRequestId: adminRequestId,
            cookId: adminCook.user.userId,
            menuPriceCents: 5000,
            travelExpensesCents: 0,
            paymentProviderFeeCents: 0,
            platformFeePercentCook: 10,
            platformFeePercentCustomer: 10,
            platformFeeCentsCook: 500,
            platformFeeCentsCustomer: 500,
            payoutCentsCook: 4500,
            totalWithoutDiscountsCentsCustomer: 5500,
            createdAt: window.firstMonthAt,
        });

        const activity = await adminAnalyticsCookSessionActivityFindOne(window.range, viewer.requestingSession, viewer.serverRuntime);

        expect(activity.productiveCookCount).toBe(1);
        expect(activity.cookCount).toBe(0);
    });
});
