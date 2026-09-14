import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import type { OccasionCreate } from '../db/schema';
import { occasions, promoCodes } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { occasionPromoFindOne } from './occasionPromoFindOne';

async function insertOccasion(overrides: Partial<OccasionCreate> = {}) {
    const occasionId = overrides.occasionId ?? idCreate();
    const [row] = await testDb
        .insert(occasions)
        .values({
            occasionId,
            pathName: `occasion-${occasionId}`,
            name: 'Geburtstag',
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
            ...overrides,
        })
        .returning();
    if (!row) throw new Error('insertOccasion: insert returned no rows');
    return row;
}

describe('occasionPromoFindOne', () => {
    it('returns redeem code and amount for an active global assignment', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();
        const promoCodeId = idCreate();
        await testDb.insert(promoCodes).values({
            promoCodeId,
            redeemCode: `ACTIVE-${promoCodeId.slice(0, 8)}`,
            amountCents: 5000,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        const occasion = await insertOccasion({ promoCodeId });

        // Act
        const promo = await occasionPromoFindOne(occasion.occasionId, requestingSession, serverRuntime);

        // Assert
        expect(promo).toEqual({ redeemCode: `ACTIVE-${promoCodeId.slice(0, 8)}`, amountCents: 5000 });
    });

    it('returns null when the assigned promo is expired', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();
        const promoCodeId = idCreate();
        await testDb.insert(promoCodes).values({
            promoCodeId,
            redeemCode: `OLD-${promoCodeId.slice(0, 8)}`,
            amountCents: 2500,
            expiresAt: new Date(Date.now() - 60_000),
        });
        const occasion = await insertOccasion({ promoCodeId });

        // Act / Assert
        await expect(occasionPromoFindOne(occasion.occasionId, requestingSession, serverRuntime)).resolves.toBeNull();
    });

    it('returns null when no promo is assigned', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup();
        const occasion = await insertOccasion();

        // Act / Assert
        await expect(occasionPromoFindOne(occasion.occasionId, requestingSession, serverRuntime)).resolves.toBeNull();
    });
});
