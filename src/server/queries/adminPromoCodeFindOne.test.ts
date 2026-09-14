import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { promoCodes } from '../db/schema';
import type { PromoCodeCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { adminPromoCodeFindOne } from './adminPromoCodeFindOne';

async function insertPromoCode(overrides: Partial<PromoCodeCreate> = {}) {
    const promoCodeId = overrides.promoCodeId ?? idCreate();
    const [row] = await testDb
        .insert(promoCodes)
        .values({
            promoCodeId,
            redeemCode: `PROMO-${idCreate().slice(0, 8)}`,
            amountCents: 1000,
            expiresAt: new Date(Date.now() + 86_400_000),
            ...overrides,
        })
        .returning();
    if (!row) throw new Error('insertPromoCode: no row');
    return row;
}

describe('adminPromoCodeFindOne', () => {
    it('returns the mapped promo code row', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const row = await insertPromoCode({ redeemCode: `FIND-${idCreate().slice(0, 8)}`, amountCents: 2500 });

        // Act
        const result = await adminPromoCodeFindOne({ promoCodeId: row.promoCodeId }, requestingSession, serverRuntime);

        // Assert
        expect(result).toMatchObject({
            promoCodeId: row.promoCodeId,
            redeemCode: row.redeemCode,
            amountCents: 2500,
            scopedBookingRequestId: null,
        });
    });

    it('maps scopedBookingRequestId when set', async () => {
        const setup = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });
        const { userBookingRequestCreate } = await import('../commands/userBookingRequestCreate');
        const { userMutationParent } = await import('../test/commandTestUtils');
        const created = await userBookingRequestCreate(
            userMutationParent(setup.user.userId),
            {
                input: {
                    occasion: 'Scoped',
                    dateTime: new Date('2030-06-15T18:00:00.000Z'),
                    exactEventAddress: {
                        displayText: 'Musterstraße 1, 80331 München',
                        latitude: 48.137,
                        longitude: 11.575,
                        addressLine1: 'Musterstraße 1',
                        addressLine2: '',
                        city: 'München',
                        postCode: '80331',
                        state: 'BY',
                        country: 'DE',
                    },
                    originalMessage: 'Hello',
                    preferences: [],
                    participants: [{ type: 'ADULT', name: 'Participant', restrictions: [] }],
                    priceClassType: 'MEDIUM',
                },
            },
            setup.requestingSession,
            setup.serverRuntime,
        );
        const row = await insertPromoCode({
            redeemCode: `SCOPE-${idCreate().slice(0, 8)}`,
            bookingRequestId: created.referenceId!,
        });

        const result = await adminPromoCodeFindOne({ promoCodeId: row.promoCodeId }, setup.requestingSession, setup.serverRuntime);
        expect(result?.scopedBookingRequestId).toBe(created.referenceId);
    });

    it('returns null when the promo code id is unknown', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();

        // Act / Assert
        await expect(adminPromoCodeFindOne({ promoCodeId: idCreate() }, requestingSession, serverRuntime)).resolves.toBeNull();
    });
});
