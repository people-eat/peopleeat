import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cooks } from '../db/schema';
import type { CookCreate } from '../db/schema';
import { toGqlCook } from '../mappers/toGqlCook';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';
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
        });
        expect(result?.range.startDateTime).toBeTruthy();
        expect(result?.range.endDateTime).toBeTruthy();
    });
});
