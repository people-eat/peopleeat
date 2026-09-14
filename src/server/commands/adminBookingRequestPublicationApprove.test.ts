import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import type { BookingRequestCreate } from '../db/schema';
import { admins, bookingRequestCooks, bookingRequests, cooks } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestPublicationApprove } from './adminBookingRequestPublicationApprove';

const berlin = {
    displayText: 'Berlin',
    latitude: 52.52,
    longitude: 13.405,
    addressLine1: 'Street 1',
    addressLine2: '',
    city: 'Berlin',
    postCode: '10115',
    state: 'BE',
    country: 'DE',
};

async function setupCookReadyToOffer() {
    const setup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Offer' });
    await testDb.insert(cooks).values({
        cookId: setup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_test',
        stripeAccountActive: true,
    });
    return setup;
}

async function insertCustomerBookingRequest(overrides: Partial<BookingRequestCreate> = {}) {
    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Host' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Birthday',
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        exactEventAddress: {
            ...berlin,
            latitude: 52.53,
            longitude: 13.41,
        },
        priceClassType: 'MEDIUM',
        originalMessage: 'Looking for a chef',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
        expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        ...overrides,
    });
    return { customer, bookingRequestId };
}

describe('adminBookingRequestPublicationApprove', () => {
    it('approves a blocked request and notifies cooks in radius', async () => {
        const cook = await setupCookReadyToOffer();
        const admin = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Ops' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        const { customer, bookingRequestId } = await insertCustomerBookingRequest({
            publicationStatus: 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW',
            exactEventAddress: berlin,
        });

        const result = await adminBookingRequestPublicationApprove(
            adminMutationParent(admin.user.userId),
            { bookingRequestId, cookIds: null },
            admin.requestingSession,
            admin.serverRuntime,
        );
        expect(result.success).toBe(true);

        const [request] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(request?.publicationStatus).toBe('PUBLICATION_APPROVED_BY_ADMIN');
        expect(request?.userId).toBe(customer.user.userId);

        const [affinity] = await testDb
            .select()
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.bookingRequestId, bookingRequestId), eq(bookingRequestCooks.cookId, cook.user.userId)));
        expect(affinity?.notifiedAt).toBeTruthy();
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(admin.serverRuntime.email.send).toHaveBeenCalled();
    });
});
