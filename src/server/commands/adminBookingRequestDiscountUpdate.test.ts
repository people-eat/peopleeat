import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, bookingRequests, promoCodes } from '../db/schema';
import { adminMutationParent, commandSetup, testDb, userMutationParent } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { adminBookingRequestDiscountUpdate } from './adminBookingRequestDiscountUpdate';
import { userBookingRequestCreate } from './userBookingRequestCreate';

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

async function createCustomerBookingRequest(setup: Awaited<ReturnType<typeof commandSetup.withUser>>) {
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

describe('adminBookingRequestDiscountUpdate', () => {
    it('applies a global promo on behalf of the customer', async () => {
        const admin = await commandSetup.withUser({ firstName: 'discount-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        const customer = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });
        const bookingRequestId = await createCustomerBookingRequest(customer);

        const redeemCode = `ADMIN-${idCreate().slice(0, 8)}`;
        await testDb.insert(promoCodes).values({
            promoCodeId: idCreate(),
            redeemCode,
            amountCents: 1500,
            expiresAt: new Date(Date.now() + 86_400_000),
        });

        const result = await adminBookingRequestDiscountUpdate(
            adminMutationParent(admin.user.userId),
            { bookingRequestId, redeemCode },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(result.success).toBe(true);
        expect(result.referenceId).toBe(redeemCode);
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalled();

        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(row?.promoCodeId).toBeTruthy();
        expect(row?.giftCardId).toBeNull();
    });

    it('clears an applied promo', async () => {
        const admin = await commandSetup.withUser({ firstName: 'discount-clear-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        const customer = await commandSetup.withUser({
            phoneNumber: phoneNumberCreate(),
            birthDate: '1990-05-01',
            preferredCommunication: 'WHATS_APP',
        });
        const bookingRequestId = await createCustomerBookingRequest(customer);

        const redeemCode = `CLEAR-${idCreate().slice(0, 8)}`;
        const promoCodeId = idCreate();
        await testDb.insert(promoCodes).values({
            promoCodeId,
            redeemCode,
            amountCents: 2000,
            expiresAt: new Date(Date.now() + 86_400_000),
        });
        await testDb.update(bookingRequests).set({ promoCodeId }).where(eq(bookingRequests.bookingRequestId, bookingRequestId));

        const result = await adminBookingRequestDiscountUpdate(
            adminMutationParent(admin.user.userId),
            { bookingRequestId, redeemCode: null },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(result.success).toBe(true);
        expect(result.referenceId).toBe(bookingRequestId);

        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(row?.promoCodeId).toBeNull();
        expect(row?.giftCardId).toBeNull();
    });

    it('rejects an unknown booking request', async () => {
        const admin = await commandSetup.withUser({ firstName: 'discount-missing-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        await expect(
            adminBookingRequestDiscountUpdate(
                adminMutationParent(admin.user.userId),
                { bookingRequestId: idCreate(), redeemCode: 'ANY' },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/not found/);
    });
});
