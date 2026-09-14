import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import type { PartnerCreate } from '../db/schema';
import { partners, promoCodes } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { partnerPromoFindOne } from './partnerPromoFindOne';

async function insertPartner(overrides: Partial<PartnerCreate> = {}) {
    const partnerId = overrides.partnerId ?? idCreate();
    const [row] = await testDb
        .insert(partners)
        .values({
            partnerId,
            pathName: `partner-${partnerId}`,
            name: 'Acme',
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
            ...overrides,
        })
        .returning();
    if (!row) throw new Error('insertPartner: insert returned no rows');
    return row;
}

describe('partnerPromoFindOne', () => {
    it('returns redeem code and amount for an active global assignment', async () => {
        const { requestingSession, serverRuntime } = await commandSetup();
        const promoCodeId = idCreate();
        await testDb.insert(promoCodes).values({
            promoCodeId,
            redeemCode: `ACTIVE-${promoCodeId.slice(0, 8)}`,
            amountCents: 5000,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        const partner = await insertPartner({ promoCodeId });

        const promo = await partnerPromoFindOne(partner.partnerId, requestingSession, serverRuntime);

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
        const partner = await insertPartner({ promoCodeId });

        await expect(partnerPromoFindOne(partner.partnerId, requestingSession, serverRuntime)).resolves.toBeNull();
    });

    it('returns null when no promo is assigned', async () => {
        const { requestingSession, serverRuntime } = await commandSetup();
        const partner = await insertPartner();

        await expect(partnerPromoFindOne(partner.partnerId, requestingSession, serverRuntime)).resolves.toBeNull();
    });
});
