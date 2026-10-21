import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cookCallSlotBookings, cooks } from '../db/schema';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestOfferCallSlotDecline } from './adminBookingRequestOfferCallSlotDecline';

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

async function seedPendingSlot(initiator: 'CUSTOMER' | 'COOK') {
    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'AdminDecline' });
    await testDb.insert(cooks).values({ cookId: cookSetup.user.userId });

    const customerSetup = await commandSetup.withUser({ firstName: 'Customer', lastName: 'AdminDecline' });
    const adminSetup = await commandSetup.withUser({ firstName: 'Admin', lastName: 'Decline' });
    await testDb.insert(admins).values({ adminId: adminSetup.user.userId });

    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customerSetup.user.userId,
        occasion: 'Dinner',
        dateTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        exactEventAddress: berlin,
        priceClassType: 'MEDIUM',
        originalMessage: 'Looking for a chef',
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
    });

    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cookSetup.user.userId,
        cookAccepted: true,
        userAccepted: null,
        menuPriceCents: 25_000,
        travelExpensesCents: 2_000,
        paymentProviderFeeCents: 800,
        platformFeePercentCook: 18,
        platformFeePercentCustomer: 4,
        platformFeeCentsCook: 4_500,
        platformFeeCentsCustomer: 1_000,
        payoutCentsCook: 22_500,
        totalWithoutDiscountsCentsCustomer: 28_800,
        paymentStatus: 'EMPTY',
    });

    const startAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + 30 * 60_000);
    const cookCallSlotBookingId = idCreate();
    await testDb.insert(cookCallSlotBookings).values({
        cookCallSlotBookingId,
        cookId: cookSetup.user.userId,
        userId: customerSetup.user.userId,
        bookingRequestOfferId,
        initiator,
        status: 'PENDING',
        startAt,
        endAt,
    });

    return {
        serverRuntime: adminSetup.serverRuntime,
        requestingSession: adminSetup.requestingSession,
        adminId: adminSetup.user.userId,
        bookingRequestOfferId,
        cookCallSlotBookingId,
    };
}

describe('adminBookingRequestOfferCallSlotDecline', () => {
    it('declines a cook-initiated slot on behalf of the customer', async () => {
        const fixture = await seedPendingSlot('COOK');

        const result = await adminBookingRequestOfferCallSlotDecline(
            adminMutationParent(fixture.adminId),
            {
                cookCallSlotBookingId: fixture.cookCallSlotBookingId,
                onBehalfOf: 'CUSTOMER',
                reason: 'Admin closed this request',
            },
            fixture.requestingSession,
            fixture.serverRuntime,
        );

        expect(result.success).toBe(true);

        const [slot] = await testDb
            .select()
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, fixture.cookCallSlotBookingId))
            .limit(1);

        expect(slot?.status).toBe('DECLINED');
        expect(slot?.declineReason).toBe('Admin closed this request');

        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(
                and(
                    eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId),
                    eq(bookingRequestOfferEvents.type, 'USER_CALL_SLOT_DECLINED'),
                ),
            )
            .limit(1);

        expect(event).toBeTruthy();
    });

    it('rejects onBehalfOf that is not the counterparty', async () => {
        const fixture = await seedPendingSlot('COOK');

        await expect(
            adminBookingRequestOfferCallSlotDecline(
                adminMutationParent(fixture.adminId),
                {
                    cookCallSlotBookingId: fixture.cookCallSlotBookingId,
                    onBehalfOf: 'COOK',
                    reason: null,
                },
                fixture.requestingSession,
                fixture.serverRuntime,
            ),
        ).rejects.toThrow(/onBehalfOf must be CUSTOMER/);
    });
});
