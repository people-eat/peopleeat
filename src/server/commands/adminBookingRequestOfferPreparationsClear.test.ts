import { asc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import type { BookingRequestOfferParticipantAmendment } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { adminMutationParent, commandSetup, testDb } from '../test/commandTestUtils';
import { adminBookingRequestOfferPreparationsClear } from './adminBookingRequestOfferPreparationsClear';

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

function pendingAmendment(): BookingRequestOfferParticipantAmendment {
    return {
        amendmentApplyId: idCreate(),
        requestedAt: '2026-06-01T12:00:00.000Z',
        menuPriceCentsBefore: 40_000,
        travelExpensesCentsBefore: 2_000,
        totalCentsCustomerBefore: 45_000,
        payoutCentsCookBefore: 34_800,
    };
}

function expectNoOutbound(serverRuntime: ServerRuntime) {
    expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    expect(serverRuntime.email.send).not.toHaveBeenCalled();
    expect(serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
    expect(serverRuntime.jobs.cancel).not.toHaveBeenCalled();
}

async function readOffer(bookingRequestOfferId: string) {
    const [offer] = await testDb
        .select()
        .from(bookingRequestOffers)
        .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
    const events = await testDb
        .select()
        .from(bookingRequestOfferEvents)
        .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, bookingRequestOfferId))
        .orderBy(asc(bookingRequestOfferEvents.bookingRequestOfferEventId));
    return { offer, events };
}

async function seedPreparationsOffer(preparationsCompletedAt: Date | null) {
    const admin = await commandSetup.withUser({ firstName: 'Ops', lastName: 'Admin' });
    await testDb.insert(admins).values({ adminId: admin.user.userId });

    const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
    await testDb.insert(cooks).values({
        cookId: cook.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_prep',
        stripeAccountActive: true,
    });

    const customer = await commandSetup.withUser({ firstName: 'Host', lastName: 'Customer' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Birthday',
        dateTime: new Date('2026-12-15T18:00:00.000Z'),
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
        cookId: cook.user.userId,
        cookAccepted: true,
        userAccepted: true,
        userUnreadNotificationCount: 3,
        cookUnreadNotificationCount: 5,
        menuPriceCents: 40_000,
        travelExpensesCents: 2_000,
        paymentProviderFeeCents: 800,
        platformFeePercentCook: 18,
        platformFeePercentCustomer: 4,
        platformFeeCentsCook: 7_200,
        platformFeeCentsCustomer: 1_600,
        payoutCentsCook: 34_800,
        totalWithoutDiscountsCentsCustomer: 45_000,
        totalCentsCustomer: 45_000,
        giftCardAppliedCents: 0,
        paymentStatus: 'EMPTY',
        paymentData: { paymentIntentId: 'pi_prep', clientSecret: 'pi_secret' },
        preparationsCompletedAt,
        participantAmendment: pendingAmendment(),
        plannedPayoutDateTime: new Date('2026-12-01T12:00:00.000Z'),
    });

    return { admin, cook, customer, bookingRequestOfferId };
}

describe('adminBookingRequestOfferPreparationsClear', () => {
    it('clears preparations, records an event, and publishes cook, customer, and admin updates', async () => {
        // Arrange
        const completedAt = new Date('2026-06-01T12:00:00.000Z');
        const { admin, cook, customer, bookingRequestOfferId } = await seedPreparationsOffer(completedAt);
        const before = await readOffer(bookingRequestOfferId);

        // Act
        const result = await adminBookingRequestOfferPreparationsClear(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: bookingRequestOfferId });
        const { offer, events } = await readOffer(bookingRequestOfferId);
        expect(before.offer?.preparationsCompletedAt).toEqual(completedAt);
        expect(offer?.preparationsCompletedAt).toBeNull();
        expect(offer?.participantAmendment).toEqual(before.offer?.participantAmendment);
        expect(offer?.userUnreadNotificationCount).toBe(3);
        expect(offer?.cookUnreadNotificationCount).toBe(5);
        expect(offer?.menuPriceCents).toBe(40_000);
        expect(offer?.paymentStatus).toBe('EMPTY');
        expect(events).toHaveLength(1);
        expect(events[0]?.type).toBe('ADMIN_PREPARATIONS_CLEARED');
        expect(events[0]?.payload).toEqual({});
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(2);
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(admin.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        expect(admin.serverRuntime.email.send).not.toHaveBeenCalled();
        expect(admin.serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
        expect(admin.serverRuntime.jobs.cancel).not.toHaveBeenCalled();
    });

    it('returns success without writing or publishing when preparations are already clear', async () => {
        // Arrange
        const { admin, bookingRequestOfferId } = await seedPreparationsOffer(null);
        const before = await readOffer(bookingRequestOfferId);

        // Act
        const result = await adminBookingRequestOfferPreparationsClear(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: bookingRequestOfferId });
        expect(await readOffer(bookingRequestOfferId)).toEqual(before);
        expect(before.offer?.preparationsCompletedAt).toBeNull();
        expect(before.events).toHaveLength(0);
        expectNoOutbound(admin.serverRuntime);
    });

    it('returns failure when the offer does not exist', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'Ops', lastName: 'Admin' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const bookingRequestOfferId = idCreate();

        // Act
        const result = await adminBookingRequestOfferPreparationsClear(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: false });
        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer).toBeUndefined();
        expectNoOutbound(admin.serverRuntime);
    });
});
