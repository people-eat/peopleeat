import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, cooks, sessions } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminAnalyticsCustomerSessionActivityFindOne } from './adminAnalyticsCustomerSessionActivityFindOne';

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

describe('adminAnalyticsCustomerSessionActivityFindOne', () => {
    it('counts a customer whose session lastInteractionAt is in range and zero-fills empty months', async () => {
        const viewer = await commandSetup.withUser();
        const window = activityWindow();
        const customer = await commandSetup.withUser({ firstName: 'Guest', lastName: 'Active' });
        await testDb.insert(sessions).values({
            sessionId: idCreate(),
            userId: customer.user.userId,
            lastInteractionAt: window.firstMonthAt,
        });

        const activity = await adminAnalyticsCustomerSessionActivityFindOne(window.range, viewer.requestingSession, viewer.serverRuntime);

        expect(activity.customerCount).toBe(1);
        expect(activity.monthBuckets).toHaveLength(3);
        expect(activity.monthBuckets[0]?.count).toBe(1);
        expect(activity.monthBuckets[1]?.count).toBe(0);
        expect(activity.monthBuckets[2]?.count).toBe(0);
        expect(activity.weekBuckets.some((bucket) => bucket.count === 1)).toBe(true);
    });

    it('excludes cooks, admins, bots, and impersonation', async () => {
        const viewer = await commandSetup.withUser();
        const window = activityWindow();
        const customer = await commandSetup.withUser({ firstName: 'Guest', lastName: 'Only' });
        await testDb.insert(sessions).values({
            sessionId: idCreate(),
            userId: customer.user.userId,
            lastInteractionAt: window.firstMonthAt,
        });

        const cook = await commandSetup.withUser({ firstName: 'Cook', lastName: 'Skip' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        await testDb.insert(sessions).values({
            sessionId: idCreate(),
            userId: cook.user.userId,
            lastInteractionAt: window.firstMonthAt,
        });

        const admin = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Skip' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        await testDb.insert(sessions).values({
            sessionId: idCreate(),
            userId: admin.user.userId,
            lastInteractionAt: window.firstMonthAt,
        });

        const bot = await commandSetup.withUser({ firstName: 'Bot', lastName: 'Skip' });
        await testDb.insert(sessions).values({
            sessionId: idCreate(),
            userId: bot.user.userId,
            lastInteractionAt: window.firstMonthAt,
            isBot: true,
        });

        const impersonated = await commandSetup.withUser({ firstName: 'Impersonated', lastName: 'Skip' });
        await testDb.insert(sessions).values({
            sessionId: idCreate(),
            userId: impersonated.user.userId,
            lastInteractionAt: window.firstMonthAt,
            impersonationReturnSessionId: viewer.requestingSession.sessionId,
        });

        const activity = await adminAnalyticsCustomerSessionActivityFindOne(window.range, viewer.requestingSession, viewer.serverRuntime);

        expect(activity.customerCount).toBe(1);
        expect(activity.monthBuckets[0]?.count).toBe(1);
    });
});
