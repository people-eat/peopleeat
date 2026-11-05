import { asc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type { FeatureToggleKey } from '../../shared/featureToggle';
import { idCreate } from '../../shared/idCreate';
import {
    bookingRequestOfferEvents,
    bookingRequestOffers,
    bookingRequestParticipants,
    bookingRequests,
    cooks,
    featureToggles,
    featureToggleUserOverrides,
} from '../db/schema';
import type { BookingRequestOfferParticipantAmendment } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { commandSetup, testDb, userMutationParent } from '../test/commandTestUtils';
import { userBookingRequestOfferParticipantAmendmentCancel } from './userBookingRequestOfferParticipantAmendmentCancel';

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
            { type: 'ADULT', name: 'B', restrictions: [] },
        ],
        menuPriceCentsBefore: 40_000,
        travelExpensesCentsBefore: 2_000,
        totalCentsCustomerBefore: 45_000,
        payoutCentsCookBefore: 34_800,
        ...overrides,
    };
}

async function setFeatureToggle(featureToggleKey: FeatureToggleKey, enabled: boolean) {
    await testDb.insert(featureToggles).values({ featureToggleKey, enabled }).onConflictDoUpdate({
        target: featureToggles.featureToggleKey,
        set: { enabled },
    });
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

async function seedCancelOffer(options?: {
    userAccepted?: boolean | null;
    cookAccepted?: boolean | null;
    participantAmendment?: BookingRequestOfferParticipantAmendment | null;
}) {
    const cook = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Cook' });
    const customer = await commandSetup.withUser({ firstName: 'Host', lastName: 'Customer' });
    await testDb.insert(cooks).values({
        cookId: cook.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_cancel',
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
    ]);

    const bookingRequestOfferId = idCreate();
    await testDb.insert(bookingRequestOffers).values({
        bookingRequestOfferId,
        bookingRequestId,
        cookId: cook.user.userId,
        cookAccepted: options?.cookAccepted === undefined ? true : options.cookAccepted,
        userAccepted: options?.userAccepted === undefined ? true : options.userAccepted,
        userUnreadNotificationCount: 2,
        cookUnreadNotificationCount: 3,
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
        paymentData: { setupIntentId: 'seti_cancel', clientSecret: 'seti_secret' },
        participantAmendment: options && 'participantAmendment' in options ? options.participantAmendment : pendingAmendment(),
        plannedPayoutDateTime: new Date('2026-12-01T12:00:00.000Z'),
    });

    return { cook, customer, bookingRequestId, bookingRequestOfferId };
}

describe('userBookingRequestOfferParticipantAmendmentCancel', () => {
    it('clears the amendment, bumps the cook unread count, and publishes', async () => {
        // Arrange
        await setFeatureToggle('BOOKING_REQUEST_OFFER_AMENDMENT', true);
        const { cook, customer, bookingRequestId, bookingRequestOfferId } = await seedCancelOffer();
        const participantsBefore = await testDb
            .select()
            .from(bookingRequestParticipants)
            .where(eq(bookingRequestParticipants.bookingRequestId, bookingRequestId))
            .orderBy(asc(bookingRequestParticipants.bookingRequestParticipantId));

        // Act
        const result = await userBookingRequestOfferParticipantAmendmentCancel(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: bookingRequestOfferId });
        const { offer, events, participants } = await readState(bookingRequestOfferId, bookingRequestId);
        expect(offer?.participantAmendment).toBeNull();
        expect(offer?.cookUnreadNotificationCount).toBe(4);
        expect(offer?.userUnreadNotificationCount).toBe(2);
        expect(offer?.menuPriceCents).toBe(40_000);
        expect(offer?.paymentStatus).toBe('SETUP');
        expect(participants).toEqual(participantsBefore);
        expect(events).toHaveLength(1);
        expect(events[0]?.type).toBe('USER_PARTICIPANT_AMENDMENT_CANCELED');
        expect(events[0]?.payload).toEqual({});
        expect(customer.serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(2);
        expect(customer.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: customer.user.userId });
        expect(customer.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: cook.user.userId });
        expect(customer.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
        expect(customer.serverRuntime.publish.adminUpdates).toHaveBeenCalledWith();
        expect(customer.serverRuntime.email.send).not.toHaveBeenCalled();
        expect(customer.serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
        expect(customer.serverRuntime.jobs.cancel).not.toHaveBeenCalled();
    });

    it('returns failure when the feature is disabled for the customer and leaves the amendment', async () => {
        // Arrange — per-user override wins over the global row, so this does not flip the shared toggle.
        await setFeatureToggle('BOOKING_REQUEST_OFFER_AMENDMENT', true);
        const { customer, bookingRequestId, bookingRequestOfferId } = await seedCancelOffer();
        await testDb
            .insert(featureToggleUserOverrides)
            .values({
                userId: customer.user.userId,
                featureToggleKey: 'BOOKING_REQUEST_OFFER_AMENDMENT',
                enabled: false,
            })
            .onConflictDoUpdate({
                target: [featureToggleUserOverrides.userId, featureToggleUserOverrides.featureToggleKey],
                set: { enabled: false },
            });
        const before = await readState(bookingRequestOfferId, bookingRequestId);

        // Act
        const result = await userBookingRequestOfferParticipantAmendmentCancel(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: false });
        expect(await readState(bookingRequestOfferId, bookingRequestId)).toEqual(before);
        expectNoOutbound(customer.serverRuntime);
    });

    it('returns failure when the offer belongs to another customer and leaves the amendment', async () => {
        // Arrange
        await setFeatureToggle('BOOKING_REQUEST_OFFER_AMENDMENT', true);
        const { bookingRequestId, bookingRequestOfferId } = await seedCancelOffer();
        const other = await commandSetup.withUser({ firstName: 'Other', lastName: 'Host' });
        const before = await readState(bookingRequestOfferId, bookingRequestId);

        // Act
        const result = await userBookingRequestOfferParticipantAmendmentCancel(
            userMutationParent(other.user.userId),
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
        await setFeatureToggle('BOOKING_REQUEST_OFFER_AMENDMENT', true);
        const customer = await commandSetup.withUser({ firstName: 'Host', lastName: 'Customer' });
        const bookingRequestOfferId = idCreate();

        // Act
        const result = await userBookingRequestOfferParticipantAmendmentCancel(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: false });
        const [offer] = await testDb
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer).toBeUndefined();
        expectNoOutbound(customer.serverRuntime);
    });

    it('returns failure when the cook has declined and leaves the amendment', async () => {
        // Arrange
        await setFeatureToggle('BOOKING_REQUEST_OFFER_AMENDMENT', true);
        const { customer, bookingRequestId, bookingRequestOfferId } = await seedCancelOffer({
            userAccepted: true,
            cookAccepted: false,
        });
        const before = await readState(bookingRequestOfferId, bookingRequestId);

        // Act
        const result = await userBookingRequestOfferParticipantAmendmentCancel(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: false });
        expect(await readState(bookingRequestOfferId, bookingRequestId)).toEqual(before);
        expectNoOutbound(customer.serverRuntime);
    });

    it('returns failure when neither party has accepted and leaves the amendment', async () => {
        // Arrange
        await setFeatureToggle('BOOKING_REQUEST_OFFER_AMENDMENT', true);
        const { customer, bookingRequestId, bookingRequestOfferId } = await seedCancelOffer({
            userAccepted: null,
            cookAccepted: null,
        });
        const before = await readState(bookingRequestOfferId, bookingRequestId);

        // Act
        const result = await userBookingRequestOfferParticipantAmendmentCancel(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: false });
        expect(await readState(bookingRequestOfferId, bookingRequestId)).toEqual(before);
        expectNoOutbound(customer.serverRuntime);
    });

    it('returns failure when there is no pending amendment and leaves the offer', async () => {
        // Arrange
        await setFeatureToggle('BOOKING_REQUEST_OFFER_AMENDMENT', true);
        const { customer, bookingRequestId, bookingRequestOfferId } = await seedCancelOffer({ participantAmendment: null });
        const before = await readState(bookingRequestOfferId, bookingRequestId);

        // Act
        const result = await userBookingRequestOfferParticipantAmendmentCancel(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: false });
        expect(await readState(bookingRequestOfferId, bookingRequestId)).toEqual(before);
        expectNoOutbound(customer.serverRuntime);
    });

    it('returns failure when the amendment is already claimed and leaves it', async () => {
        // Arrange
        await setFeatureToggle('BOOKING_REQUEST_OFFER_AMENDMENT', true);
        const { customer, bookingRequestId, bookingRequestOfferId } = await seedCancelOffer({
            participantAmendment: pendingAmendment({ claimedAt: '2026-06-02T08:00:00.000Z' }),
        });
        const before = await readState(bookingRequestOfferId, bookingRequestId);

        // Act
        const result = await userBookingRequestOfferParticipantAmendmentCancel(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: false });
        expect(await readState(bookingRequestOfferId, bookingRequestId)).toEqual(before);
        expect(before.offer?.participantAmendment?.claimedAt).toBe('2026-06-02T08:00:00.000Z');
        expectNoOutbound(customer.serverRuntime);
    });

    it('returns failure when a blank claimedAt misses the conditional update', async () => {
        // Arrange — '' is falsy in the read check, then the SQL `claimedAt IS NULL` guard matches nothing.
        await setFeatureToggle('BOOKING_REQUEST_OFFER_AMENDMENT', true);
        const { customer, bookingRequestId, bookingRequestOfferId } = await seedCancelOffer({
            participantAmendment: pendingAmendment({ claimedAt: '' }),
        });
        const before = await readState(bookingRequestOfferId, bookingRequestId);

        // Act
        const result = await userBookingRequestOfferParticipantAmendmentCancel(
            userMutationParent(customer.user.userId),
            { bookingRequestOfferId },
            customer.requestingSession,
            customer.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: false });
        expect(await readState(bookingRequestOfferId, bookingRequestId)).toEqual(before);
        expectNoOutbound(customer.serverRuntime);
    });

    it('throws Unauthorized when the user does not exist and leaves the amendment', async () => {
        // Arrange
        const { bookingRequestId, bookingRequestOfferId } = await seedCancelOffer();
        const stranger = await commandSetup();
        const before = await readState(bookingRequestOfferId, bookingRequestId);

        // Act + Assert
        await expect(
            userBookingRequestOfferParticipantAmendmentCancel(
                userMutationParent(idCreate()),
                { bookingRequestOfferId },
                stranger.requestingSession,
                stranger.serverRuntime,
            ),
        ).rejects.toThrow(/Unauthorized/);

        expect(await readState(bookingRequestOfferId, bookingRequestId)).toEqual(before);
        expectNoOutbound(stranger.serverRuntime);
    });
});
