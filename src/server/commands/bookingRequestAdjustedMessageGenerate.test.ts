import { generateText } from 'ai';
import type * as AiModule from 'ai';
import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { aiGenerations, bookingRequests } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { bookingRequestAdjustedMessageGenerate } from './bookingRequestAdjustedMessageGenerate';

vi.mock('ai', async (importOriginal) => {
    const actual = await importOriginal<typeof AiModule>();
    return {
        ...actual,
        generateText: vi.fn(),
    };
});

const sampleAddress = {
    displayText: 'Musterstraße 1, 80331 München',
    latitude: 48.137,
    longitude: 11.575,
    addressLine1: 'Musterstraße 1',
    addressLine2: '',
    city: 'München',
    postCode: '80331',
    state: 'BY',
    country: 'DE',
};

async function seedRequest(options?: { originalMessage?: string; adjustedMessage?: string | null }) {
    const customer = await commandSetup.withUser({ firstName: 'Msg', lastName: 'Customer', locale: 'de' });
    const bookingRequestId = idCreate();
    await testDb.insert(bookingRequests).values({
        bookingRequestId,
        userId: customer.user.userId,
        occasion: 'Birthday',
        dateTime: new Date('2030-06-15T18:00:00.000Z'),
        exactEventAddress: sampleAddress,
        priceClassType: 'MEDIUM',
        originalMessage: options?.originalMessage ?? 'Please cook for us at home. Call me at +49 170 1234567.',
        adjustedMessage: options?.adjustedMessage === undefined ? null : options.adjustedMessage,
        publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        preferences: [],
        expiresAt: new Date('2030-06-15T23:59:59.999Z'),
    });
    return { customer, bookingRequestId };
}

describe('bookingRequestAdjustedMessageGenerate', () => {
    it('writes adjustedMessage, records an AiGeneration, and publishes adminUpdates', async () => {
        const { customer, bookingRequestId } = await seedRequest();
        vi.mocked(generateText).mockResolvedValue({
            text: 'Please cook for us at home.',
            usage: {
                inputTokens: 10,
                outputTokens: 5,
                totalTokens: 15,
                inputTokenDetails: {},
                outputTokenDetails: {},
            },
            finalStep: { response: { modelId: 'mock-adjusted' } },
        } as never);

        const result = await bookingRequestAdjustedMessageGenerate({
            bookingRequestId,
            requestingSession: customer.requestingSession,
            serverRuntime: customer.serverRuntime,
        });

        expect(result).toBe('Please cook for us at home.');
        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(row?.adjustedMessage).toBe('Please cook for us at home.');

        const [generation] = await testDb
            .select()
            .from(aiGenerations)
            .where(eq(aiGenerations.kind, 'BOOKING_REQUEST_ADJUSTED_MESSAGE'));
        expect(generation?.userId).toBe(customer.user.userId);
        expect(customer.serverRuntime.publish.adminUpdates).toHaveBeenCalled();
    });

    it('skips when adjustedMessage is already set', async () => {
        const { customer, bookingRequestId } = await seedRequest({ adjustedMessage: 'Already set by admin' });
        vi.mocked(generateText).mockClear();

        const result = await bookingRequestAdjustedMessageGenerate({
            bookingRequestId,
            requestingSession: customer.requestingSession,
            serverRuntime: customer.serverRuntime,
        });

        expect(result).toBe('Already set by admin');
        expect(generateText).not.toHaveBeenCalled();
    });

    it('skips when originalMessage is empty', async () => {
        const { customer, bookingRequestId } = await seedRequest({ originalMessage: '   ' });
        // Schema requires originalMessage; force empty after insert for the short-circuit path.
        await testDb
            .update(bookingRequests)
            .set({ originalMessage: '' })
            .where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        vi.mocked(generateText).mockClear();

        const result = await bookingRequestAdjustedMessageGenerate({
            bookingRequestId,
            requestingSession: customer.requestingSession,
            serverRuntime: customer.serverRuntime,
        });

        expect(result).toBeNull();
        expect(generateText).not.toHaveBeenCalled();
    });

    it('leaves adjustedMessage null when the model throws', async () => {
        const { customer, bookingRequestId } = await seedRequest();
        vi.mocked(generateText).mockRejectedValue(new Error('model down'));

        const result = await bookingRequestAdjustedMessageGenerate({
            bookingRequestId,
            requestingSession: customer.requestingSession,
            serverRuntime: customer.serverRuntime,
        });

        expect(result).toBeNull();
        const [row] = await testDb.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, bookingRequestId));
        expect(row?.adjustedMessage).toBeNull();
    });
});
