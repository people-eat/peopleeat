import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import {
    bookingRequestOfferCallRoomParticipants,
    bookingRequestOfferCallRooms,
    bookingRequestOffers,
    bookingRequests,
    cooks,
} from '../db/schema';
import type * as SlackNotifyCallSlotModule from '../slack/slackNotifyCallSlot';
import { slackNotifyCallRoomEvent } from '../slack/slackNotifyCallSlot';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { bookingRequestOfferCallRoomParticipantLeft } from './bookingRequestOfferCallRoomParticipantLeft';

vi.mock('../slack/slackNotifyCallSlot', async (importOriginal) => {
    const actual = await importOriginal<typeof SlackNotifyCallSlotModule>();
    return {
        ...actual,
        slackNotifyCallRoomEvent: vi.fn(async () => {}),
    };
});

vi.mock('./bookingRequestOfferCallRoomEndIfEmpty', () => ({
    bookingRequestOfferCallRoomEndIfEmpty: vi.fn(async () => true),
}));

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

describe('bookingRequestOfferCallRoomParticipantLeft', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('notifies Slack left for the participant actor', async () => {
        const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Leave' });
        await testDb.insert(cooks).values({ cookId: cookSetup.user.userId, callSchedulingEnabled: true, callDurationMinutes: 30 });

        const customerSetup = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Leave' });
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
            cookUnreadNotificationCount: 0,
            userUnreadNotificationCount: 0,
        });

        const bookingRequestOfferCallRoomId = idCreate();
        await testDb.insert(bookingRequestOfferCallRooms).values({
            bookingRequestOfferCallRoomId,
            bookingRequestOfferId,
            livekitRoomName: `test-offer-${bookingRequestOfferId}`,
            status: 'ACTIVE',
            createdByUserId: customerSetup.user.userId,
        });

        const bookingRequestOfferCallRoomParticipantId = idCreate();
        await testDb.insert(bookingRequestOfferCallRoomParticipants).values({
            bookingRequestOfferCallRoomParticipantId,
            bookingRequestOfferCallRoomId,
            sessionId: customerSetup.requestingSession.sessionId,
            userId: customerSetup.user.userId,
        });

        await bookingRequestOfferCallRoomParticipantLeft(customerSetup.serverRuntime, bookingRequestOfferCallRoomParticipantId, {
            actingUserId: customerSetup.user.userId,
        });

        const [participant] = await testDb
            .select()
            .from(bookingRequestOfferCallRoomParticipants)
            .where(
                eq(
                    bookingRequestOfferCallRoomParticipants.bookingRequestOfferCallRoomParticipantId,
                    bookingRequestOfferCallRoomParticipantId,
                ),
            );
        expect(participant?.leftAt).toBeTruthy();

        expect(slackNotifyCallRoomEvent).toHaveBeenCalledWith(
            customerSetup.serverRuntime,
            expect.objectContaining({
                bookingRequestId,
                bookingRequestOfferId,
                action: 'left',
                actor: 'customer',
            }),
        );
    });

    it('does not notify Slack when the participant already left', async () => {
        const customerSetup = await commandSetup.withUser({ firstName: 'Customer', lastName: 'AlreadyLeft' });
        const bookingRequestOfferCallRoomParticipantId = idCreate();

        await bookingRequestOfferCallRoomParticipantLeft(customerSetup.serverRuntime, bookingRequestOfferCallRoomParticipantId, {
            actingUserId: customerSetup.user.userId,
        });

        expect(slackNotifyCallRoomEvent).not.toHaveBeenCalled();
    });
});
