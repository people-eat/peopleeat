import { generateText } from 'ai';
import type * as AiModule from 'ai';
import { eq } from 'drizzle-orm';
import { EgressStatus } from 'livekit-server-sdk';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../../shared/idCreate';
import {
    bookingRequestOfferCallRecordings,
    bookingRequestOfferCallRooms,
    bookingRequestOffers,
    bookingRequests,
    cooks,
} from '../../db/schema';
import { commandSetup, testDb } from '../../test/commandTestUtils';
import { bookingRequestOfferCallRecordingFinalize } from './bookingRequestOfferCallRecordingFinalize';

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

async function seedRecording(options?: {
    status?: 'PENDING' | 'EGRESS_COMPLETE' | 'TRANSCRIBING' | 'COMPLETED' | 'FAILED';
    livekitEgressId?: string | null;
}) {
    const cookSetup = await commandSetup.withUser({ firstName: 'Chef', lastName: 'Call' });
    await testDb.insert(cooks).values({
        cookId: cookSetup.user.userId,
        isVisible: true,
        isApprovedByAdmin: true,
        exactTravelOriginAddress: berlin,
        travelExpensesAmount: 25,
        maximumTravelDistance: 100,
        stripeAccountId: 'acct_call',
        stripeAccountActive: true,
    });

    const customer = await commandSetup.withUser({ firstName: 'Customer', lastName: 'Call' });
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
    const objectKey = `call-recordings/${bookingRequestOfferCallRoomId}.ogg`;
    await testDb.insert(bookingRequestOfferCallRecordings).values({
        bookingRequestOfferCallRecordingId,
        bookingRequestOfferCallRoomId,
        livekitEgressId: options?.livekitEgressId === undefined ? 'EG_test_1' : options.livekitEgressId,
        objectKey,
        mediaType: 'audio/ogg',
        status: options?.status ?? 'PENDING',
    });

    return {
        serverRuntime: cookSetup.serverRuntime,
        bookingRequestOfferCallRoomId,
        bookingRequestOfferCallRecordingId,
        objectKey,
    };
}

describe('bookingRequestOfferCallRecordingFinalize', () => {
    it('no-ops when status is already COMPLETED', async () => {
        // Arrange
        const { serverRuntime, bookingRequestOfferCallRoomId } = await seedRecording({ status: 'COMPLETED' });
        vi.mocked(serverRuntime.objectStorage.isConfigured).mockReturnValue(true);

        // Act
        await bookingRequestOfferCallRecordingFinalize.handler({
            data: { bookingRequestOfferCallRoomId },
            serverRuntime,
        });

        // Assert
        expect(serverRuntime.livekit.egress).not.toHaveBeenCalled();
        expect(generateText).not.toHaveBeenCalled();
        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    });

    it('no-ops when status is already FAILED', async () => {
        // Arrange
        const { serverRuntime, bookingRequestOfferCallRoomId } = await seedRecording({ status: 'FAILED' });
        vi.mocked(serverRuntime.objectStorage.isConfigured).mockReturnValue(true);

        // Act
        await bookingRequestOfferCallRecordingFinalize.handler({
            data: { bookingRequestOfferCallRoomId },
            serverRuntime,
        });

        // Assert
        expect(serverRuntime.livekit.egress).not.toHaveBeenCalled();
        expect(generateText).not.toHaveBeenCalled();
    });

    it('no-ops when object storage is not configured', async () => {
        // Arrange
        const { serverRuntime, bookingRequestOfferCallRoomId } = await seedRecording({ status: 'PENDING' });
        vi.mocked(serverRuntime.objectStorage.isConfigured).mockReturnValue(false);

        // Act
        await bookingRequestOfferCallRecordingFinalize.handler({
            data: { bookingRequestOfferCallRoomId },
            serverRuntime,
        });

        // Assert
        expect(serverRuntime.livekit.egress).not.toHaveBeenCalled();
        expect(generateText).not.toHaveBeenCalled();
        const [row] = await testDb
            .select()
            .from(bookingRequestOfferCallRecordings)
            .where(eq(bookingRequestOfferCallRecordings.bookingRequestOfferCallRoomId, bookingRequestOfferCallRoomId));
        expect(row?.status).toBe('PENDING');
    });

    it('marks FAILED when livekitEgressId is missing on PENDING', async () => {
        // Arrange
        const { serverRuntime, bookingRequestOfferCallRoomId, bookingRequestOfferCallRecordingId } = await seedRecording({
            status: 'PENDING',
            livekitEgressId: null,
        });
        vi.mocked(serverRuntime.objectStorage.isConfigured).mockReturnValue(true);

        // Act + Assert
        await expect(
            bookingRequestOfferCallRecordingFinalize.handler({
                data: { bookingRequestOfferCallRoomId },
                serverRuntime,
            }),
        ).rejects.toThrow(/no livekitEgressId/);

        const [row] = await testDb
            .select()
            .from(bookingRequestOfferCallRecordings)
            .where(eq(bookingRequestOfferCallRecordings.bookingRequestOfferCallRecordingId, bookingRequestOfferCallRecordingId));
        expect(row?.status).toBe('FAILED');
        expect(row?.errorMessage).toMatch(/no livekitEgressId/);
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('polls LiveKit once, transcribes, and completes when egress is already done', async () => {
        // Arrange — first listEgress returns COMPLETE so the poll loop never sleeps
        const { serverRuntime, bookingRequestOfferCallRoomId, bookingRequestOfferCallRecordingId, objectKey } = await seedRecording({
            status: 'PENDING',
        });
        vi.mocked(serverRuntime.objectStorage.isConfigured).mockReturnValue(true);
        const listEgress = vi.fn(async () => [
            {
                status: EgressStatus.EGRESS_COMPLETE,
                fileResults: [{ size: 2048n }],
                error: '',
            },
        ]);
        vi.mocked(serverRuntime.livekit.egress).mockReturnValue({ listEgress } as never);
        vi.mocked(serverRuntime.objectStorage.getObject).mockResolvedValue({
            body: Buffer.from([1, 2, 3, 4]),
            contentType: 'audio/ogg',
            contentLength: 4,
        });
        vi.mocked(generateText)
            .mockResolvedValueOnce({
                output: {
                    segments: [
                        { startedAtMs: 0, endedAtMs: 1_000, text: 'Hello chef', speakerLabel: 'customer' },
                        { startedAtMs: 1_100, endedAtMs: 2_000, text: 'Welcome', speakerLabel: 'cook' },
                    ],
                },
                usage: {
                    inputTokens: 20,
                    outputTokens: 10,
                    totalTokens: 30,
                    inputTokenDetails: {},
                    outputTokenDetails: {},
                },
                finalStep: { response: { modelId: 'mock-transcript' } },
            } as never)
            .mockResolvedValueOnce({
                output: { summary: 'Customer and cook discussed the dinner menu.' },
                usage: {
                    inputTokens: 10,
                    outputTokens: 5,
                    totalTokens: 15,
                    inputTokenDetails: {},
                    outputTokenDetails: {},
                },
                finalStep: { response: { modelId: 'mock-summary' } },
            } as never);

        // Act
        await bookingRequestOfferCallRecordingFinalize.handler({
            data: { bookingRequestOfferCallRoomId },
            serverRuntime,
        });

        // Assert
        expect(listEgress).toHaveBeenCalledWith({ egressId: 'EG_test_1' });
        expect(serverRuntime.objectStorage.getObject).toHaveBeenCalledWith(objectKey);
        expect(generateText).toHaveBeenCalledTimes(2);

        const [row] = await testDb
            .select()
            .from(bookingRequestOfferCallRecordings)
            .where(eq(bookingRequestOfferCallRecordings.bookingRequestOfferCallRecordingId, bookingRequestOfferCallRecordingId));
        expect(row?.status).toBe('COMPLETED');
        expect(row?.transcriptText).toBe('Hello chef\nWelcome');
        expect(row?.transcriptJson).toEqual([
            { startedAtMs: 0, endedAtMs: 1_000, text: 'Hello chef', speakerLabel: 'customer' },
            { startedAtMs: 1_100, endedAtMs: 2_000, text: 'Welcome', speakerLabel: 'cook' },
        ]);
        expect(row?.summaryText).toBe('Customer and cook discussed the dinner menu.');
        expect(row?.completedAt).toBeInstanceOf(Date);
        expect(serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });
});
