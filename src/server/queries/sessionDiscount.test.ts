import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { promoCodes } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { sessionDiscount } from './sessionDiscount';

describe('sessionDiscount', () => {
    it('returns a global promo', async () => {
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const redeemCode = `PUB-${idCreate().slice(0, 8)}`;
        await testDb.insert(promoCodes).values({
            promoCodeId: idCreate(),
            redeemCode,
            amountCents: 2000,
            expiresAt: new Date(Date.now() + 86_400_000),
        });

        const result = await sessionDiscount({ redeemCode }, requestingSession, serverRuntime);
        expect(result).toMatchObject({ redeemCode, amountCents: 2000 });
    });

    it('hides booking-scoped promo codes', async () => {
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
        const redeemCode = `HIDE-${idCreate().slice(0, 8)}`;
        await testDb.insert(promoCodes).values({
            promoCodeId: idCreate(),
            redeemCode,
            amountCents: 5000,
            bookingRequestId: created.referenceId!,
            expiresAt: new Date(Date.now() + 86_400_000),
        });

        const result = await sessionDiscount({ redeemCode }, setup.requestingSession, setup.serverRuntime);
        expect(result).toBeNull();
    });
});
