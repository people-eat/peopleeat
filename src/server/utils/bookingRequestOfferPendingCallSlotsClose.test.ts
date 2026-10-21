import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import type { CookCallSlotBookingCreate } from '../db/schema';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cookCallSlotBookings, cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { bookingRequestOfferPendingCallSlotsClose } from './bookingRequestOfferPendingCallSlotsClose';

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

async function seedOfferWithPendingSlot(initiator: 'CUSTOMER' | 'COOK' = 'COOK') {
    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Close' });
    await testDb.insert(cooks).values({ cookId: cookSetup.user.userId });

    const customerSetup = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Close' });
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
    const slotInsert: CookCallSlotBookingCreate = {
        cookCallSlotBookingId,
        cookId: cookSetup.user.userId,
        userId: customerSetup.user.userId,
        bookingRequestOfferId,
        initiator,
        status: 'PENDING',
        startAt,
        endAt,
    };
    await testDb.insert(cookCallSlotBookings).values(slotInsert);

    return {
        serverRuntime: customerSetup.serverRuntime,
        bookingRequestOfferId,
        cookCallSlotBookingId,
        startAt,
        endAt,
    };
}

describe('bookingRequestOfferPendingCallSlotsClose', () => {
    it('declines PENDING slots when the offer is declined by the customer', async () => {
        const fixture = await seedOfferWithPendingSlot('COOK');
        const now = new Date();

        const closedIds = await fixture.serverRuntime.db.transaction((transaction) =>
            bookingRequestOfferPendingCallSlotsClose(transaction, {
                bookingRequestOfferIds: [fixture.bookingRequestOfferId],
                reason: { kind: 'OFFER_DECLINED', declinedBy: 'CUSTOMER' },
                now,
            }),
        );

        expect(closedIds).toEqual([fixture.cookCallSlotBookingId]);

        const [slot] = await testDb
            .select()
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, fixture.cookCallSlotBookingId))
            .limit(1);

        expect(slot?.status).toBe('DECLINED');
        expect(slot?.declineReason).toBe('OFFER_DECLINED');

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

        expect(event?.payload).toMatchObject({
            cookCallSlotBookingId: fixture.cookCallSlotBookingId,
            declineReason: 'OFFER_DECLINED',
        });
    });

    it('cancels PENDING slots when the booking request expires', async () => {
        const fixture = await seedOfferWithPendingSlot('CUSTOMER');
        const now = new Date();

        const closedIds = await fixture.serverRuntime.db.transaction((transaction) =>
            bookingRequestOfferPendingCallSlotsClose(transaction, {
                bookingRequestOfferIds: [fixture.bookingRequestOfferId],
                reason: { kind: 'BOOKING_REQUEST_EXPIRED' },
                now,
            }),
        );

        expect(closedIds).toEqual([fixture.cookCallSlotBookingId]);

        const [slot] = await testDb
            .select()
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, fixture.cookCallSlotBookingId))
            .limit(1);

        expect(slot?.status).toBe('CANCELED');
        expect(slot?.canceledReason).toBe('BOOKING_REQUEST_EXPIRED');

        const [event] = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(
                and(
                    eq(bookingRequestOfferEvents.bookingRequestOfferId, fixture.bookingRequestOfferId),
                    eq(bookingRequestOfferEvents.type, 'USER_CALL_SLOT_CANCELLED'),
                ),
            )
            .limit(1);

        expect(event?.payload).toMatchObject({
            cookCallSlotBookingId: fixture.cookCallSlotBookingId,
            wasConfirmed: false,
            reason: 'BOOKING_REQUEST_EXPIRED',
        });
    });

    it('leaves CONFIRMED slots untouched', async () => {
        const fixture = await seedOfferWithPendingSlot('COOK');
        await testDb
            .update(cookCallSlotBookings)
            .set({ status: 'CONFIRMED' })
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, fixture.cookCallSlotBookingId));

        const closedIds = await fixture.serverRuntime.db.transaction((transaction) =>
            bookingRequestOfferPendingCallSlotsClose(transaction, {
                bookingRequestOfferIds: [fixture.bookingRequestOfferId],
                reason: { kind: 'OFFER_DECLINED', declinedBy: 'COOK' },
                now: new Date(),
            }),
        );

        expect(closedIds).toEqual([]);

        const [slot] = await testDb
            .select()
            .from(cookCallSlotBookings)
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, fixture.cookCallSlotBookingId))
            .limit(1);

        expect(slot?.status).toBe('CONFIRMED');
    });
});
