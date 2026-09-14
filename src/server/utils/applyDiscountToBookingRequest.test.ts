import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { userBookingRequestCreate } from '../commands/userBookingRequestCreate';
import { bookingRequests, promoCodes } from '../db/schema';
import { commandSetup, testDb, userMutationParent } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { applyDiscountToBookingRequest } from './applyDiscountToBookingRequest';

const sampleAddress = {
    displayText: 'Musterstraße 1, 80331 München',
    latitude: 48.137,
    longitude: 11.575,
    addressLine1: 'Musterstraße 1',
    addressLine2: '',
    city: 'München',
    postCode: '80331',
    state: 'BY',
    country: 'DE',
};

async function createOwnedBookingRequest(setup: Awaited<ReturnType<typeof commandSetup.withUser>>) {
    const result = await userBookingRequestCreate(
        userMutationParent(setup.user.userId),
        {
            input: {
                occasion: 'Birthday',
                dateTime: new Date('2030-06-15T18:00:00.000Z'),
                exactEventAddress: sampleAddress,
                originalMessage: 'Please cook for us.',
                preferences: [],
                participants: [{ type: 'ADULT', name: 'Participant', restrictions: [] }],
                priceClassType: 'MEDIUM',
            },
        },
        setup.requestingSession,
        setup.serverRuntime,
    );
    expect(result.referenceId).toBeTruthy();
    return result.referenceId!;
}

describe('applyDiscountToBookingRequest', () => {
    it('applies a global promo to the owned booking request', async () => {
        const setup = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });
        const bookingRequestId = await createOwnedBookingRequest(setup);
        const redeemCode = `GLOBAL-${idCreate().slice(0, 8)}`;
        await testDb.insert(promoCodes).values({
            promoCodeId: idCreate(),
            redeemCode,
            amountCents: 1000,
            expiresAt: new Date(Date.now() + 86_400_000),
        });

        const ok = await applyDiscountToBookingRequest(setup.serverRuntime, setup.user.userId, bookingRequestId, redeemCode);
        expect(ok).toBe(true);

        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(row?.promoCodeId).toBeTruthy();
        expect(row?.giftCardId).toBeNull();
    });

    it('rejects a scoped promo when applied to a different booking request', async () => {
        const setup = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });
        const scopedFor = await createOwnedBookingRequest(setup);
        const other = await createOwnedBookingRequest(setup);
        const redeemCode = `SCOPED-${idCreate().slice(0, 8)}`;
        await testDb.insert(promoCodes).values({
            promoCodeId: idCreate(),
            redeemCode,
            amountCents: 5000,
            bookingRequestId: scopedFor,
            expiresAt: new Date(Date.now() + 86_400_000),
        });

        const ok = await applyDiscountToBookingRequest(setup.serverRuntime, setup.user.userId, other, redeemCode);
        expect(ok).toBe(false);
    });

    it('applies a scoped promo to its intended booking request', async () => {
        const setup = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });
        const bookingRequestId = await createOwnedBookingRequest(setup);
        const redeemCode = `CHURN-${idCreate().slice(0, 8)}`;
        const promoCodeId = idCreate();
        await testDb.insert(promoCodes).values({
            promoCodeId,
            redeemCode,
            amountCents: 5000,
            bookingRequestId,
            expiresAt: new Date(Date.now() + 86_400_000),
        });

        const ok = await applyDiscountToBookingRequest(setup.serverRuntime, setup.user.userId, bookingRequestId, redeemCode);
        expect(ok).toBe(true);

        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(row?.promoCodeId).toBe(promoCodeId);
    });

    it('rejects expired promo codes', async () => {
        const setup = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });
        const bookingRequestId = await createOwnedBookingRequest(setup);
        const redeemCode = `OLD-${idCreate().slice(0, 8)}`;
        await testDb.insert(promoCodes).values({
            promoCodeId: idCreate(),
            redeemCode,
            amountCents: 1000,
            expiresAt: new Date(Date.now() - 60_000),
        });

        const ok = await applyDiscountToBookingRequest(setup.serverRuntime, setup.user.userId, bookingRequestId, redeemCode);
        expect(ok).toBe(false);
    });

    it('moves a global promo between the user’s open requests', async () => {
        const setup = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });
        const first = await createOwnedBookingRequest(setup);
        const second = await createOwnedBookingRequest(setup);
        const redeemCode = `MOVE-${idCreate().slice(0, 8)}`;
        const promoCodeId = idCreate();
        await testDb.insert(promoCodes).values({
            promoCodeId,
            redeemCode,
            amountCents: 1500,
            expiresAt: new Date(Date.now() + 86_400_000),
        });

        expect(await applyDiscountToBookingRequest(setup.serverRuntime, setup.user.userId, first, redeemCode)).toBe(true);
        expect(await applyDiscountToBookingRequest(setup.serverRuntime, setup.user.userId, second, redeemCode)).toBe(true);

        const [firstRow] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, first));
        const [secondRow] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, second));
        expect(firstRow?.promoCodeId).toBeNull();
        expect(secondRow?.promoCodeId).toBe(promoCodeId);
    });

    it('ignores unknown redeem codes', async () => {
        const setup = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });
        const bookingRequestId = await createOwnedBookingRequest(setup);
        const ok = await applyDiscountToBookingRequest(setup.serverRuntime, setup.user.userId, bookingRequestId, 'NOPE-NOPE-NOPE');
        expect(ok).toBe(false);
    });
});
