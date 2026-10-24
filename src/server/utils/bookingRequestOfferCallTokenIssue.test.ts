import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import {
    bookingRequestOfferCallRooms,
    bookingRequestOfferEvents,
    bookingRequestOffers,
    bookingRequests,
    cookCallSlotBookings,
    cooks,
} from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { bookingRequestOfferCallTokenIssue } from './bookingRequestOfferCallTokenIssue';

vi.mock('./bookingRequestOfferCallRecordingStart', () => ({
    bookingRequestOfferCallRecordingStart: vi.fn(async () => {}),
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

async function seedOfferFixture() {
    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Call' });
    await testDb.insert(cooks).values({ cookId: cookSetup.user.userId, callSchedulingEnabled: true, callDurationMinutes: 30 });

    const customerSetup = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Call' });
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

    return { cookSetup, customerSetup, bookingRequestOfferId };
}

function stubLivekit(serverRuntime: Awaited<ReturnType<typeof commandSetup.withUser>>['serverRuntime']) {
    vi.mocked(serverRuntime.livekit.roomService).mockReturnValue({
        createRoom: vi.fn(async () => ({})),
        deleteRoom: vi.fn(async () => {}),
        listParticipants: vi.fn(async () => []),
    } as never);
    vi.mocked(serverRuntime.livekit.accessTokenCreate).mockResolvedValue('test-token');
    vi.mocked(serverRuntime.livekit.url).mockReturnValue('wss://livekit.test');
}

describe('bookingRequestOfferCallTokenIssue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('writes USER_CALL_STARTED and bumps cook unread for spontaneous create', async () => {
        const { customerSetup, bookingRequestOfferId } = await seedOfferFixture();
        stubLivekit(customerSetup.serverRuntime);

        await bookingRequestOfferCallTokenIssue(customerSetup.serverRuntime, {
            bookingRequestOfferId,
            actingUserId: customerSetup.user.userId,
            sessionId: customerSetup.requestingSession.sessionId,
            mode: 'create',
        });

        const events = await testDb
            .select()
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, bookingRequestOfferId));
        const started = events.filter((event) => event.type === 'USER_CALL_STARTED');
        expect(started).toHaveLength(1);
        expect(started[0]?.payload).toMatchObject({
            bookingRequestOfferCallRoomId: expect.any(String),
        });

        const [offer] = await testDb
            .select({
                cookUnreadNotificationCount: bookingRequestOffers.cookUnreadNotificationCount,
                userUnreadNotificationCount: bookingRequestOffers.userUnreadNotificationCount,
            })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.cookUnreadNotificationCount).toBe(1);
        expect(offer?.userUnreadNotificationCount).toBe(0);
    });

    it('writes COOK_CALL_STARTED when the cook starts a spontaneous call', async () => {
        const { cookSetup, bookingRequestOfferId } = await seedOfferFixture();
        stubLivekit(cookSetup.serverRuntime);

        await bookingRequestOfferCallTokenIssue(cookSetup.serverRuntime, {
            bookingRequestOfferId,
            actingUserId: cookSetup.user.userId,
            sessionId: cookSetup.requestingSession.sessionId,
            mode: 'create',
        });

        const events = await testDb
            .select({ type: bookingRequestOfferEvents.type })
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, bookingRequestOfferId));
        expect(events.some((event) => event.type === 'COOK_CALL_STARTED')).toBe(true);

        const [offer] = await testDb
            .select({
                cookUnreadNotificationCount: bookingRequestOffers.cookUnreadNotificationCount,
                userUnreadNotificationCount: bookingRequestOffers.userUnreadNotificationCount,
            })
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
        expect(offer?.userUnreadNotificationCount).toBe(1);
        expect(offer?.cookUnreadNotificationCount).toBe(0);
    });

    it('does not write CALL_STARTED when create links a joinable confirmed slot', async () => {
        const { cookSetup, customerSetup, bookingRequestOfferId } = await seedOfferFixture();
        stubLivekit(customerSetup.serverRuntime);

        const startAt = new Date(Date.now() + 5 * 60_000);
        const endAt = new Date(startAt.getTime() + 30 * 60_000);
        await testDb.insert(cookCallSlotBookings).values({
            cookCallSlotBookingId: idCreate(),
            cookId: cookSetup.user.userId,
            userId: customerSetup.user.userId,
            bookingRequestOfferId,
            startAt,
            endAt,
            status: 'CONFIRMED',
            initiator: 'CUSTOMER',
        });

        await bookingRequestOfferCallTokenIssue(customerSetup.serverRuntime, {
            bookingRequestOfferId,
            actingUserId: customerSetup.user.userId,
            sessionId: customerSetup.requestingSession.sessionId,
            mode: 'create',
        });

        const events = await testDb
            .select({ type: bookingRequestOfferEvents.type })
            .from(bookingRequestOfferEvents)
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, bookingRequestOfferId));
        expect(events.some((event) => event.type.endsWith('_CALL_STARTED'))).toBe(false);

        const [room] = await testDb
            .select()
            .from(bookingRequestOfferCallRooms)
            .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferId, bookingRequestOfferId));
        expect(room?.status).toBe('ACTIVE');
    });
});
