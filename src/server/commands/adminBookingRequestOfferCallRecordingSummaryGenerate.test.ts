import { generateText } from 'ai';
import type * as AiModule from 'ai';
import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import {
    admins,
    bookingRequestOfferCallRecordings,
    bookingRequestOfferCallRooms,
    bookingRequestOffers,
    bookingRequests,
    cooks,
} from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminBookingRequestOfferCallRecordingSummaryGenerate } from './adminBookingRequestOfferCallRecordingSummaryGenerate';

vi.mock('ai', async (importOriginal) => {
    const actual = await importOriginal<typeof AiModule>();
    return {
        ...actual,
        generateText: vi.fn(),
    };
});

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

async function seedCompletedRecording(options?: { transcriptText?: string | null }) {
    const admin = await commandSetup.withUser({ firstName: 'rec-sum-admin', lastName: 'User' });
    await testDb.insert(admins).values({ adminId: admin.user.userId });

    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Sum' });
    await testDb.insert(cooks).values({
        cookId: cookSetup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_sum',
        stripeAccountActive: true,
    });

    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Sum' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Dinner',
        dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        exactEventAddress: berlin,
        priceClassType: 'MEDIUM',
        originalMessage: 'Hi',
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
        menuPriceCents: 20_000,
        travelExpensesCents: 2_500,
        paymentProviderFeeCents: 500,
        platformFeePercentCook: 18,
        platformFeePercentCustomer: 0,
        platformFeeCentsCook: 3_600,
        platformFeeCentsCustomer: 0,
        payoutCentsCook: 18_400,
        totalWithoutDiscountsCentsCustomer: 23_000,
        totalCentsCustomer: 23_000,
        paymentStatus: 'PAYED',
    });

    const bookingRequestOfferCallRoomId = idCreate();
    await testDb.insert(bookingRequestOfferCallRooms).values({
        bookingRequestOfferCallRoomId,
        bookingRequestOfferId,
        livekitRoomName: `test-room-${bookingRequestOfferCallRoomId}`,
        status: 'ENDED',
        createdByUserId: customer.user.userId,
        endedAt: new Date(),
    });

    const bookingRequestOfferCallRecordingId = idCreate();
    await testDb.insert(bookingRequestOfferCallRecordings).values({
        bookingRequestOfferCallRecordingId,
        bookingRequestOfferCallRoomId,
        livekitEgressId: 'EG_sum',
        objectKey: `call-recordings/${bookingRequestOfferCallRoomId}.ogg`,
        mediaType: 'audio/ogg',
        status: 'COMPLETED',
        transcriptText: options?.transcriptText === undefined ? 'Hello chef\nWelcome' : options.transcriptText,
        completedAt: new Date(),
    });

    return { admin, bookingRequestOfferCallRecordingId };
}

describe('adminBookingRequestOfferCallRecordingSummaryGenerate', () => {
    it('persists a new summary and publishes adminUpdates', async () => {
        const { admin, bookingRequestOfferCallRecordingId } = await seedCompletedRecording();
        vi.mocked(generateText).mockResolvedValue({
            output: { summary: 'They agreed on a three-course menu for Saturday.' },
            usage: {
                inputTokens: 8,
                outputTokens: 4,
                totalTokens: 12,
                inputTokenDetails: {},
                outputTokenDetails: {},
            },
            finalStep: { response: { modelId: 'mock-summary' } },
        } as never);

        const summary = await adminBookingRequestOfferCallRecordingSummaryGenerate(
            adminMutationParent(admin.user.userId),
            { bookingRequestOfferCallRecordingId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        expect(summary).toBe('They agreed on a three-course menu for Saturday.');
        const [row] = await testDb
            .select()
            .from(bookingRequestOfferCallRecordings)
            .where(eq(bookingRequestOfferCallRecordings.bookingRequestOfferCallRecordingId, bookingRequestOfferCallRecordingId));
        expect(row?.summaryText).toBe(summary);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('rejects when there is no transcript', async () => {
        const { admin, bookingRequestOfferCallRecordingId } = await seedCompletedRecording({ transcriptText: null });

        await expect(
            adminBookingRequestOfferCallRecordingSummaryGenerate(
                adminMutationParent(admin.user.userId),
                { bookingRequestOfferCallRecordingId },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/no transcript/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows.some((row) => row.level === 'error')).toBe(true);
    });
});
