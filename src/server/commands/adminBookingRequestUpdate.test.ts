import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, bookingRequests } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { phoneNumberCreate } from '../test/phoneNumberCreate';
import { adminBookingRequestUpdate } from './adminBookingRequestUpdate';

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

async function setupAdminAndRequest() {
    const admin = await commandSetup.withUser({ firstName: 'booking-admin-update', lastName: 'User' });
    await testDb.insert(admins).values({ adminId: admin.user.userId });
    const customer = await commandSetup.withUser({
        firstName: 'update-customer',
        lastName: 'Customer',
        phoneNumber: phoneNumberCreate(),
        birthDate: '1990-05-01',
        preferredCommunication: 'E_MAIL',
    });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Birthday',
        dateTime: new Date('2030-06-15T18:00:00.000Z'),
        exactEventAddress: sampleAddress,
        priceClassType: 'MEDIUM',
        originalMessage: 'Please cook for us.',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
        expiresAt: new Date('2030-06-15T23:59:59.999Z'),
    });
    return { admin, customer, bookingRequestId };
}

describe('adminBookingRequestUpdate', () => {
    it('patches occasion, messages, price class, and address', async () => {
        const { admin, bookingRequestId } = await setupAdminAndRequest();

        const result = await adminBookingRequestUpdate(
            adminMutationParent(admin.user.userId),
            {
                bookingRequestId,
                input: {
                    occasion: 'Anniversary',
                    originalMessage: 'Updated message',
                    adjustedMessage: 'Cook-facing message',
                    priceClassType: 'HIGH',
                    exactEventAddress: {
                        ...sampleAddress,
                        city: 'Berlin',
                        displayText: 'Berlin',
                        latitude: 52.52,
                        longitude: 13.405,
                    },
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: bookingRequestId });

        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(row?.occasion).toBe('Anniversary');
        expect(row?.originalMessage).toBe('Updated message');
        expect(row?.adjustedMessage).toBe('Cook-facing message');
        expect(row?.priceClassType).toBe('HIGH');
        expect(row?.exactEventAddress.city).toBe('Berlin');
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('recomputes expiresAt when dateTime changes unless expiresAt is provided', async () => {
        const { admin, bookingRequestId } = await setupAdminAndRequest();
        const nextDateTime = new Date('2030-08-01T19:00:00.000Z');

        await adminBookingRequestUpdate(
            adminMutationParent(admin.user.userId),
            { bookingRequestId, input: { dateTime: nextDateTime } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const [auto] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(auto?.dateTime.toISOString()).toBe(nextDateTime.toISOString());
        expect(auto?.expiresAt?.toISOString()).toBe('2030-08-01T23:59:59.999Z');

        const explicitExpiresAt = new Date('2030-09-01T12:00:00.000Z');
        await adminBookingRequestUpdate(
            adminMutationParent(admin.user.userId),
            {
                bookingRequestId,
                input: {
                    dateTime: new Date('2030-09-01T18:00:00.000Z'),
                    expiresAt: explicitExpiresAt,
                },
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const [explicit] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(explicit?.expiresAt?.toISOString()).toBe(explicitExpiresAt.toISOString());
    });

    it('clears adjustedMessage when null or blank', async () => {
        const { admin, bookingRequestId } = await setupAdminAndRequest();
        await testDb
            .update(bookingRequests)
            .set({ adjustedMessage: 'Keep this' })
            .where(eq(bookingRequests.bookingRequestId, bookingRequestId));

        await adminBookingRequestUpdate(
            adminMutationParent(admin.user.userId),
            { bookingRequestId, input: { adjustedMessage: null } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        const [cleared] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(cleared?.adjustedMessage).toBeNull();
    });

    it('rejects unknown booking requests', async () => {
        const { admin } = await setupAdminAndRequest();

        await expect(
            adminBookingRequestUpdate(
                adminMutationParent(admin.user.userId),
                { bookingRequestId: idCreate(), input: { occasion: 'Nope' } },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/booking request not found/);
    });
});
