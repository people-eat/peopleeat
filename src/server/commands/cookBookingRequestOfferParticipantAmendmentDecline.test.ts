import { asc, eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequestParticipants, bookingRequests, cooks, users } from '../db/schema';
import type { BookingRequestOfferParticipantAmendment } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { commandSetup, cookMutationParent, testDb } from '../test/commandTestUtils';
import { cookBookingRequestOfferParticipantAmendmentDecline } from './cookBookingRequestOfferParticipantAmendmentDecline';

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

function pendingAmendment(overrides: Partial<BookingRequestOfferParticipantAmendment> = {}): BookingRequestOfferParticipantAmendment {
    return {
        amendmentApplyId: idCreate(),
        requestedAt: '2026-06-01T12:00:00.000Z',
        participants: [
            { type: 'ADULT', name: 'A', restrictions: [] },
            { type: 'DISCOUNTED', name: 'Child', restrictions: [] },
        ],
        menuPriceCentsBefore: 40_000,
        travelExpensesCentsBefore: 2_000,
        totalCentsCustomerBefore: 45_000,
        payoutCentsCookBefore: 34_800,
        ...overrides,
    };
}

function expectNoOutbound(serverRuntime: ServerRuntime) {
    expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    expect(serverRuntime.email.send).not.toHaveBeenCalled();
    expect(serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
    expect(serverRuntime.jobs.cancel).not.toHaveBeenCalled();
}

async function readState(bookingRequestOfferId: string, bookingRequestId: string) {
    const [offer] = await testDb
        .select()
        .from(bookingRequestOffers)
        .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
    const events = await testDb
        .select()
        .from(bookingRequestOfferEvents)
        .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, bookingRequestOfferId))
        .orderBy(asc(bookingRequestOfferEvents.bookingRequestOfferEventId));
    const participants = await testDb
        .select()
        .from(bookingRequestParticipants)
        .where(eq(bookingRequestParticipants.bookingRequestId, bookingRequestId))
        .orderBy(asc(bookingRequestParticipants.bookingRequestParticipantId));
    return { offer, events, participants };
}

async function seedDeclineOffer(participantAmendment: BookingRequestOfferParticipantAmendment | null = pendingAmendment()) {
    const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
    const customer = await commandSetup.withUser({ firstName: 'Host', lastName: 'Customer' });
    await testDb.insert(cooks).values({
        cookId: cook.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_decline',
        stripeAccountActive: true,
    });

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

    await testDb.insert(bookingRequestParticipants).values([
        { bookingRequestParticipantId: idCreate(), bookingRequestId, type: 'ADULT', name: 'Adult 1', restrictions: [] },
        { bookingRequestParticipantId: idCreate(), bookingRequestId, type: 'ADULT', name: 'Adult 2', restrictions: [] },
        { bookingRequestParticipantId: idCreate(), bookingRequestId, type: 'ADULT', name: 'Adult 3', restrictions: [] },
        { bookingRequestParticipantId: idCreate(), bookingRequestId, type: 'DISCOUNTED', name: 'Child 1', restrictions: [] },
    ]);

    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cook.user.userId,
        cookAccepted: true,
        userAccepted: true,
        userUnreadNotificationCount: 4,
        cookUnreadNotificationCount: 2,
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
        paymentStatus: 'SETUP',
        paymentData: { setupIntentId: 'seti_decline', clientSecret: 'seti_secret' },
        participantAmendment,
        plannedPayoutDateTime: new Date('2026-12-01T12:00:00.000Z'),
    });

    return { cook, customer, bookingRequestId, bookingRequestOfferId };
}

describe('cookBookingRequestOfferParticipantAmendmentDecline', () => {
    it('clears the amendment, records headcount, publishes, and emails the customer', async () => {
        // Arrange
        const { cook, customer, bookingRequestId, bookingRequestOfferId } = await seedDeclineOffer();
        const participantsBefore = await testDb
            .select()
            .from(bookingRequestParticipants)
            .where(eq(bookingRequestParticipants.bookingRequestId, bookingRequestId))
            .orderBy(asc(bookingRequestParticipants.bookingRequestParticipantId));

        // Act
        const result = await cookBookingRequestOfferParticipantAmendmentDecline(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: bookingRequestOfferId });
        const { offer, events, participants } = await readState(bookingRequestOfferId, bookingRequestId);
        expect(offer?.participantAmendment).toBeNull();
        expect(offer?.userUnreadNotificationCount).toBe(5);
        expect(offer?.cookUnreadNotificationCount).toBe(2);
        expect(offer?.menuPriceCents).toBe(40_000);
        expect(offer?.paymentStatus).toBe('SETUP');
        expect(participants).toEqual(participantsBefore);
        expect(events).toHaveLength(1);
        expect(events[0]?.type).toBe('COOK_PARTICIPANT_AMENDMENT_DECLINED');
        expect(events[0]?.payload).toEqual({
            participantsAdultBefore: 3,
            participantsDiscountedBefore: 1,
            participantsAdultAfter: 1,
            participantsDiscountedAfter: 1,
        });
        expect(cook.serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(2);
        expect(cook.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(cook.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });
        expect(cook.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
        expect(cook.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        expect(cook.serverRuntime.email.send).toHaveBeenCalledTimes(1);
        expect(cook.serverRuntime.email.send).toHaveBeenCalledWith(
            expect.objectContaining({
                to: customer.user.emailAddress,
                purpose: 'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_DECLINED',
                locale: 'de',
                userId: customer.user.userId,
                relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: bookingRequestOfferId },
            }),
        );
        expect(cook.serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
        expect(cook.serverRuntime.jobs.cancel).not.toHaveBeenCalled();
    });

    it('counts the live participants when the amendment omits a participant list', async () => {
        // Arrange
        const amendment = pendingAmendment();
        delete amendment.participants;
        const { cook, customer, bookingRequestId, bookingRequestOfferId } = await seedDeclineOffer(amendment);

        // Act
        const result = await cookBookingRequestOfferParticipantAmendmentDecline(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: bookingRequestOfferId });
        const { offer, events } = await readState(bookingRequestOfferId, bookingRequestId);
        expect(offer?.participantAmendment).toBeNull();
        expect(events[0]?.payload).toEqual({
            participantsAdultBefore: 3,
            participantsDiscountedBefore: 1,
            participantsAdultAfter: 3,
            participantsDiscountedAfter: 1,
        });
        expect(cook.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });
        expect(cook.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        expect(cook.serverRuntime.email.send).toHaveBeenCalledTimes(1);
        expect(cook.serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
        expect(cook.serverRuntime.jobs.cancel).not.toHaveBeenCalled();
    });

    it('declines without emailing when the customer has no email address', async () => {
        // Arrange
        const { cook, customer, bookingRequestId, bookingRequestOfferId } = await seedDeclineOffer();
        await testDb.update(users).set({ emailAddress: null }).where(eq(users.userId, customer.user.userId));

        // Act
        const result = await cookBookingRequestOfferParticipantAmendmentDecline(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: bookingRequestOfferId });
        const { offer, events } = await readState(bookingRequestOfferId, bookingRequestId);
        expect(offer?.participantAmendment).toBeNull();
        expect(offer?.userUnreadNotificationCount).toBe(5);
        expect(events).toHaveLength(1);
        expect(cook.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(cook.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });
        expect(cook.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        expect(cook.serverRuntime.email.send).not.toHaveBeenCalled();
        expect(cook.serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
        expect(cook.serverRuntime.jobs.cancel).not.toHaveBeenCalled();
    });

    it('declines without emailing when the cook has no email address', async () => {
        // Arrange
        const { cook, customer, bookingRequestId, bookingRequestOfferId } = await seedDeclineOffer();
        await testDb.update(users).set({ emailAddress: null }).where(eq(users.userId, cook.user.userId));

        // Act
        const result = await cookBookingRequestOfferParticipantAmendmentDecline(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: bookingRequestOfferId });
        const { offer } = await readState(bookingRequestOfferId, bookingRequestId);
        expect(offer?.participantAmendment).toBeNull();
        expect(cook.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });
        expect(cook.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        expect(cook.serverRuntime.email.send).not.toHaveBeenCalled();
        expect(cook.serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
        expect(cook.serverRuntime.jobs.cancel).not.toHaveBeenCalled();
    });

    it('declines without emailing when the customer turned booking emails off', async () => {
        // Arrange
        const { cook, customer, bookingRequestId, bookingRequestOfferId } = await seedDeclineOffer();
        await testDb
            .update(users)
            .set({ notificationSettings: { customerBooking: { email: false, whatsApp: true } } })
            .where(eq(users.userId, customer.user.userId));

        // Act
        const result = await cookBookingRequestOfferParticipantAmendmentDecline(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: bookingRequestOfferId });
        const { offer, events } = await readState(bookingRequestOfferId, bookingRequestId);
        expect(offer?.participantAmendment).toBeNull();
        expect(events).toHaveLength(1);
        expect(cook.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        expect(cook.serverRuntime.email.send).not.toHaveBeenCalled();
        expect(cook.serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
        expect(cook.serverRuntime.jobs.cancel).not.toHaveBeenCalled();
    });

    it('keeps the decline when the decline email fails to send', async () => {
        // Arrange
        const { cook, customer, bookingRequestId, bookingRequestOfferId } = await seedDeclineOffer();
        vi.mocked(cook.serverRuntime.email.send).mockRejectedValueOnce(new Error('smtp down'));

        // Act
        const result = await cookBookingRequestOfferParticipantAmendmentDecline(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: bookingRequestOfferId });
        const { offer, events } = await readState(bookingRequestOfferId, bookingRequestId);
        expect(offer?.participantAmendment).toBeNull();
        expect(events).toHaveLength(1);
        expect(cook.serverRuntime.email.send).toHaveBeenCalledTimes(1);
        expect(cook.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });
        expect(cook.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        expect(cook.serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
        expect(cook.serverRuntime.jobs.cancel).not.toHaveBeenCalled();
    });

    it('returns failure when the offer belongs to another cook and leaves the amendment', async () => {
        // Arrange
        const { bookingRequestId, bookingRequestOfferId } = await seedDeclineOffer();
        const other = await commandSetup.withUser({ firstName: 'Other', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: other.user.userId });
        const before = await readState(bookingRequestOfferId, bookingRequestId);

        // Act
        const result = await cookBookingRequestOfferParticipantAmendmentDecline(
            cookMutationParent(other.user.userId),
            { bookingRequestOfferId },
            other.requestingSession,
            other.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: false });
        expect(await readState(bookingRequestOfferId, bookingRequestId)).toEqual(before);
        expectNoOutbound(other.serverRuntime);
    });

    it('returns failure when the offer does not exist', async () => {
        // Arrange
        const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: cook.user.userId });
        const bookingRequestOfferId = idCreate();

        // Act
        const result = await cookBookingRequestOfferParticipantAmendmentDecline(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: false });
        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer).toBeUndefined();
        expectNoOutbound(cook.serverRuntime);
    });

    it('returns failure when there is no pending amendment and leaves the offer', async () => {
        // Arrange
        const { cook, bookingRequestId, bookingRequestOfferId } = await seedDeclineOffer(null);
        const before = await readState(bookingRequestOfferId, bookingRequestId);

        // Act
        const result = await cookBookingRequestOfferParticipantAmendmentDecline(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: false });
        expect(await readState(bookingRequestOfferId, bookingRequestId)).toEqual(before);
        expectNoOutbound(cook.serverRuntime);
    });

    it('returns failure when the amendment is already claimed and leaves it', async () => {
        // Arrange
        const { cook, bookingRequestId, bookingRequestOfferId } = await seedDeclineOffer(
            pendingAmendment({ claimedAt: '2026-06-02T08:00:00.000Z' }),
        );
        const before = await readState(bookingRequestOfferId, bookingRequestId);

        // Act
        const result = await cookBookingRequestOfferParticipantAmendmentDecline(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: false });
        expect(await readState(bookingRequestOfferId, bookingRequestId)).toEqual(before);
        expect(before.offer?.participantAmendment?.claimedAt).toBe('2026-06-02T08:00:00.000Z');
        expectNoOutbound(cook.serverRuntime);
    });

    it('returns failure when a blank claimedAt misses the conditional update', async () => {
        // Arrange — '' is falsy in the read check, then the SQL `claimedAt IS NULL` guard matches nothing.
        const { cook, bookingRequestId, bookingRequestOfferId } = await seedDeclineOffer(pendingAmendment({ claimedAt: '' }));
        const before = await readState(bookingRequestOfferId, bookingRequestId);

        // Act
        const result = await cookBookingRequestOfferParticipantAmendmentDecline(
            cookMutationParent(cook.user.userId),
            { bookingRequestOfferId },
            cook.requestingSession,
            cook.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: false });
        expect(await readState(bookingRequestOfferId, bookingRequestId)).toEqual(before);
        expectNoOutbound(cook.serverRuntime);
    });

    it('throws when the cook is not active and leaves the amendment', async () => {
        // Arrange
        const { cook, bookingRequestId, bookingRequestOfferId } = await seedDeclineOffer();
        await testDb.update(users).set({ status: 'BANNED' }).where(eq(users.userId, cook.user.userId));
        const before = await readState(bookingRequestOfferId, bookingRequestId);

        // Act + Assert
        await expect(
            cookBookingRequestOfferParticipantAmendmentDecline(
                cookMutationParent(cook.user.userId),
                { bookingRequestOfferId },
                cook.requestingSession,
                cook.serverRuntime,
            ),
        ).rejects.toThrow(/cookBookingRequestOfferParticipantAmendmentDecline: user is not active/);

        // Assert
        expect(await readState(bookingRequestOfferId, bookingRequestId)).toEqual(before);
        expectNoOutbound(cook.serverRuntime);
    });

    it('throws Unauthorized when the cook does not exist', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();
        const bookingRequestOfferId = idCreate();

        // Act + Assert
        await expect(
            cookBookingRequestOfferParticipantAmendmentDecline(
                cookMutationParent(idCreate()),
                { bookingRequestOfferId },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        expectNoOutbound(serverRuntime);
    });
});
