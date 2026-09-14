import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../../shared/idCreate';
import { bookingRequestOffers, bookingRequests, cookCallSlotBookings, cooks, users } from '../../db/schema';
import type { CookCallSlotBookingStatus } from '../../domain/bookingRequest';
import { commandSetup, testDb } from '../../test/commandTestUtils';
import { bookingRequestOfferCallSlotReminder } from './bookingRequestOfferCallSlotReminder';

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

async function seedReminderFixture(status: CookCallSlotBookingStatus = 'CONFIRMED') {
    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Reminder' });
    await testDb.insert(cooks).values({ cookId: cookSetup.user.userId });

    const customerSetup = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Reminder' });
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
        userAccepted: true,
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

    const startAt = new Date(Date.now() + 60 * 60_000);
    const endAt = new Date(startAt.getTime() + 30 * 60_000);
    const cookCallSlotBookingId = idCreate();
    await testDb.insert(cookCallSlotBookings).values({
        cookCallSlotBookingId,
        cookId: cookSetup.user.userId,
        userId: customerSetup.user.userId,
        bookingRequestOfferId,
        startAt,
        endAt,
        status,
        initiator: 'CUSTOMER',
    });

    return {
        serverRuntime: customerSetup.serverRuntime,
        cookUserId: cookSetup.user.userId,
        cookEmail: cookSetup.user.emailAddress!,
        customerUserId: customerSetup.user.userId,
        customerEmail: customerSetup.user.emailAddress!,
        cookCallSlotBookingId,
    };
}

describe('bookingRequestOfferCallSlotReminder', () => {
    it('emails both parties for a CONFIRMED slot', async () => {
        // Arrange
        const fixture = await seedReminderFixture('CONFIRMED');
        vi.mocked(fixture.serverRuntime.email.send).mockResolvedValue({ outboundEmailId: 'outbound-email-reminder' });

        // Act
        await bookingRequestOfferCallSlotReminder.handler({
            data: { cookCallSlotBookingId: fixture.cookCallSlotBookingId },
            serverRuntime: fixture.serverRuntime,
        });

        // Assert
        expect(fixture.serverRuntime.email.send).toHaveBeenCalledTimes(2);
        expect(fixture.serverRuntime.email.send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: fixture.customerEmail,
                purpose: 'CALL_SLOT_BOOKING_REMINDER',
                userId: fixture.customerUserId,
                relatedEntity: { type: 'COOK_CALL_SLOT_BOOKING', id: fixture.cookCallSlotBookingId },
            }),
        );
        expect(fixture.serverRuntime.email.send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: fixture.cookEmail,
                purpose: 'CALL_SLOT_BOOKING_REMINDER',
                userId: fixture.cookUserId,
                relatedEntity: { type: 'COOK_CALL_SLOT_BOOKING', id: fixture.cookCallSlotBookingId },
            }),
        );
    });

    it('no-ops for PENDING slots', async () => {
        // Arrange
        const fixture = await seedReminderFixture('PENDING');

        // Act
        await bookingRequestOfferCallSlotReminder.handler({
            data: { cookCallSlotBookingId: fixture.cookCallSlotBookingId },
            serverRuntime: fixture.serverRuntime,
        });

        // Assert
        expect(fixture.serverRuntime.email.send).not.toHaveBeenCalled();
    });

    it('no-ops for CANCELED slots', async () => {
        // Arrange
        const fixture = await seedReminderFixture('CANCELED');

        // Act
        await bookingRequestOfferCallSlotReminder.handler({
            data: { cookCallSlotBookingId: fixture.cookCallSlotBookingId },
            serverRuntime: fixture.serverRuntime,
        });

        // Assert
        expect(fixture.serverRuntime.email.send).not.toHaveBeenCalled();
    });

    it('no-ops when a party has no email address', async () => {
        // Arrange
        const fixture = await seedReminderFixture('CONFIRMED');
        await testDb.update(users).set({ emailAddress: null, status: 'ANONYMIZED' }).where(eq(users.userId, fixture.customerUserId));

        // Act
        await bookingRequestOfferCallSlotReminder.handler({
            data: { cookCallSlotBookingId: fixture.cookCallSlotBookingId },
            serverRuntime: fixture.serverRuntime,
        });

        // Assert
        expect(fixture.serverRuntime.email.send).not.toHaveBeenCalled();
    });
});
