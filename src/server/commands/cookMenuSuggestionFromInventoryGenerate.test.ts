import { generateText } from 'ai';
import type * as AiModule from 'ai';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { aiGenerations, cooks, meals } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookMenuSuggestionFromInventoryGenerate } from './cookMenuSuggestionFromInventoryGenerate';

vi.mock('ai', async (importOriginal) => {
    const actual = await importOriginal<typeof AiModule>();
    return {
        ...actual,
        generateText: vi.fn(),
    };
});

const draft = {
    title: 'Sommer Menü',
    description: 'Leicht und frisch.',
    courses: [
        {
            title: 'Vorspeise',
            mealOptions: [{ type: 'EXISTING_MEAL' as const, mealId: 'meal-1', title: null, description: null }],
        },
    ],
};

function modelObject(output: unknown, modelId: string) {
    return {
        output,
        usage: {
            inputTokens: 11,
            outputTokens: 7,
            totalTokens: 18,
            inputTokenDetails: { cacheReadTokens: 3 },
            outputTokenDetails: { reasoningTokens: 2 },
        },
        finalStep: { response: { modelId } },
    } as never;
}

describe('cookMenuSuggestionFromInventoryGenerate', () => {
    beforeEach(() => {
        vi.mocked(generateText).mockReset();
    });

    it('returns null and does not call the model when the cook has no meals', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Empty' });
        await testDb.insert(cooks).values({ cookId: user.userId });

        // Act
        const result = await cookMenuSuggestionFromInventoryGenerate({
            cookId: user.userId,
            brief: 'Sommer',
            requestingSession,
            serverRuntime,
        });

        // Assert
        expect(result).toBeNull();
        expect(generateText).not.toHaveBeenCalled();
        await serverRuntime.aiGenerations.drain();
        const rows = await testDb.select().from(aiGenerations).where(eq(aiGenerations.userId, user.userId));
        expect(rows).toHaveLength(0);
    });

    it('returns null when every meal is deleted', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Bea', lastName: 'Deleted' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        await testDb.insert(meals).values({
            mealId: idCreate(),
            cookId: user.userId,
            title: 'Gestrichen',
            description: 'Weg',
            deletedAt: new Date(),
        });

        // Act
        const result = await cookMenuSuggestionFromInventoryGenerate({
            cookId: user.userId,
            requestingSession,
            serverRuntime,
        });

        // Assert
        expect(result).toBeNull();
        expect(generateText).not.toHaveBeenCalled();
        const mealRows = await testDb.select().from(meals).where(eq(meals.cookId, user.userId));
        expect(mealRows).toHaveLength(1);
    });

    it('records an AiGeneration and keeps the meal inventory unchanged', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Cleo', lastName: 'Draft' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        const mealId = idCreate();
        await testDb.insert(meals).values({
            mealId,
            cookId: user.userId,
            title: 'Tomatensuppe',
            description: '',
        });
        vi.mocked(generateText).mockResolvedValue(modelObject(draft, 'mock-inventory'));

        // Act
        const result = await cookMenuSuggestionFromInventoryGenerate({
            cookId: user.userId,
            brief: '   ',
            bookingRequestContext: '  ',
            requestingSession,
            serverRuntime,
        });

        // Assert
        expect(result).toEqual(draft);
        const call = vi.mocked(generateText).mock.calls[0]?.[0] as { prompt: string };
        expect(call.prompt).toContain(mealId);
        expect(call.prompt).toContain('Tomatensuppe');
        expect(call.prompt).toContain('Beschreibung:"Keine"');
        expect(call.prompt).toContain('Stelle ein ausgewogenes Menü aus dem Inventar zusammen.');

        const mealRows = await testDb.select().from(meals).where(eq(meals.cookId, user.userId));
        expect(mealRows).toHaveLength(1);

        await serverRuntime.aiGenerations.drain();
        const [generation] = await testDb
            .select()
            .from(aiGenerations)
            .where(and(eq(aiGenerations.kind, 'COOK_MENU_SUGGESTION_FROM_INVENTORY'), eq(aiGenerations.userId, user.userId)));
        expect(generation?.sessionId).toBe(requestingSession.sessionId);
        expect(generation?.modelId).toBe('mock-inventory');
        expect(generation?.output).toContain('Sommer Menü');
        expect(generation?.inputTokens).toBe(11);
        expect(generation?.outputTokens).toBe(7);
        expect(generation?.totalTokens).toBe(18);
        expect(generation?.reasoningTokens).toBe(2);
        expect(generation?.cachedInputTokens).toBe(3);
    });

    it('includes the booking request and the cook brief in the prompt', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Dora', lastName: 'Brief' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        await testDb.insert(meals).values({
            mealId: idCreate(),
            cookId: user.userId,
            title: 'Risotto',
            description: 'Reis',
        });
        vi.mocked(generateText).mockResolvedValue(modelObject(draft, 'mock-inventory-brief'));

        // Act
        const result = await cookMenuSuggestionFromInventoryGenerate({
            cookId: user.userId,
            brief: 'Leichtes Sommeressen',
            bookingRequestContext: 'Geburtstag für acht Gäste',
            requestingSession: null,
            serverRuntime,
        });

        // Assert
        expect(result?.title).toBe('Sommer Menü');
        const call = vi.mocked(generateText).mock.calls[0]?.[0] as { prompt: string };
        expect(call.prompt).toContain('Geburtstag für acht Gäste');
        expect(call.prompt).toContain('Leichtes Sommeressen');
        expect(call.prompt).not.toContain('Stelle ein ausgewogenes Menü aus dem Inventar zusammen.');

        await serverRuntime.aiGenerations.drain();
        const [generation] = await testDb
            .select()
            .from(aiGenerations)
            .where(and(eq(aiGenerations.kind, 'COOK_MENU_SUGGESTION_FROM_INVENTORY'), eq(aiGenerations.userId, user.userId)));
        expect(generation?.sessionId).toBeNull();
        expect(generation?.prompt).toContain('Leichtes Sommeressen');
    });
});
