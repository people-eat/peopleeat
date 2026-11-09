import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { promoCodes } from '../db/schema';
import { commandSetup, partnerVenueInsert, testDb } from '../test/commandTestUtils';
import { partnerVenuePromoFindOne } from './partnerVenuePromoFindOne';

describe('partnerVenuePromoFindOne', () => {
    it('returns redeem code and amount for an active global assignment', async () => {
        const { requestingSession, serverRuntime } = await commandSetup();
        const promoCodeId = idCreate();
        await testDb.insert(promoCodes).values({
            promoCodeId,
            redeemCode: `ACTIVE-${promoCodeId.slice(0, 8)}`,
            amountCents: 5000,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        const venue = await partnerVenueInsert({ promoCodeId });

        const promo = await partnerVenuePromoFindOne(venue.partnerVenueId, requestingSession, serverRuntime);

        expect(promo).toEqual({ redeemCode: `ACTIVE-${promoCodeId.slice(0, 8)}`, amountCents: 5000 });
    });

    it('returns null when the assigned promo is expired', async () => {
        const { requestingSession, serverRuntime } = await commandSetup();
        const promoCodeId = idCreate();
        await testDb.insert(promoCodes).values({
            promoCodeId,
            redeemCode: `OLD-${promoCodeId.slice(0, 8)}`,
            amountCents: 2500,
            expiresAt: new Date(Date.now() - 60_000),
        });
        const venue = await partnerVenueInsert({ promoCodeId });

        await expect(partnerVenuePromoFindOne(venue.partnerVenueId, requestingSession, serverRuntime)).resolves.toBeNull();
    });

    it('returns null when no promo is assigned', async () => {
        const { requestingSession, serverRuntime } = await commandSetup();
        const venue = await partnerVenueInsert();

        await expect(partnerVenuePromoFindOne(venue.partnerVenueId, requestingSession, serverRuntime)).resolves.toBeNull();
    });
});
