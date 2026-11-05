import { generateText } from 'ai';
import type * as AiModule from 'ai';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { aiGenerations, cooks } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookBiographySuggestGenerate } from './cookBiographySuggestGenerate';

vi.mock('ai', async (importOriginal) => {
    const actual = await importOriginal<typeof AiModule>();
    return {
        ...actual,
        generateText: vi.fn(),
    };
});

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

describe('cookBiographySuggestGenerate', () => {
    beforeEach(() => {
        vi.mocked(generateText).mockReset();
    });

    it('returns a trimmed biography and records an AiGeneration', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            firstName: 'Ada',
            lastName: 'Cook',
        });
        await testDb.insert(cooks).values({ cookId: user.userId, biography: '' });
        vi.mocked(generateText).mockResolvedValue(modelObject({ biography: '  Ich koche mit Freude.  ' }, 'mock-biography'));

        // Act
        const result = await cookBiographySuggestGenerate({
            cookId: user.userId,
            currentBiography: 'Aktuelle Station in Berlin',
            requestingSession,
            serverRuntime,
        });

        // Assert
        expect(result).toBe('Ich koche mit Freude.');
        const call = vi.mocked(generateText).mock.calls[0]?.[0] as { prompt: string };
        expect(call.prompt).toContain('Ada Cook');
        expect(call.prompt).toContain('Aktuelle Station in Berlin');

        const [cook] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(cook?.biography).toBe('');

        await serverRuntime.aiGenerations.drain();
        const [generation] = await testDb
            .select()
            .from(aiGenerations)
            .where(and(eq(aiGenerations.kind, 'COOK_BIOGRAPHY_SUGGESTION'), eq(aiGenerations.userId, user.userId)));
        expect(generation?.sessionId).toBe(requestingSession.sessionId);
        expect(generation?.modelId).toBe('mock-biography');
        expect(generation?.output).toContain('Ich koche mit Freude.');
        expect(generation?.inputTokens).toBe(11);
        expect(generation?.outputTokens).toBe(7);
        expect(generation?.totalTokens).toBe(18);
        expect(generation?.reasoningTokens).toBe(2);
        expect(generation?.cachedInputTokens).toBe(3);
        expect(generation?.prompt).toContain('Aktuelle Station in Berlin');
    });

    it('asks for a first draft when the current biography is blank', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            firstName: 'Bea',
            lastName: 'Chef',
        });
        await testDb.insert(cooks).values({ cookId: user.userId });
        vi.mocked(generateText).mockResolvedValue(modelObject({ biography: 'Eine einladende Erstfassung.' }, 'mock-biography-empty'));

        // Act
        const result = await cookBiographySuggestGenerate({
            cookId: user.userId,
            currentBiography: '   ',
            requestingSession,
            serverRuntime,
        });

        // Assert
        expect(result).toBe('Eine einladende Erstfassung.');
        const call = vi.mocked(generateText).mock.calls[0]?.[0] as { prompt: string };
        expect(call.prompt).toContain('Es gibt noch keine Biografie');

        await serverRuntime.aiGenerations.drain();
        const [generation] = await testDb
            .select()
            .from(aiGenerations)
            .where(and(eq(aiGenerations.kind, 'COOK_BIOGRAPHY_SUGGESTION'), eq(aiGenerations.userId, user.userId)));
        expect(generation?.output).toContain('Eine einladende Erstfassung.');
    });

    it('throws before calling the model when the cook user is missing', async () => {
        // Arrange
        const { serverRuntime, requestingSession } = await commandSetup();

        // Act
        const pending = cookBiographySuggestGenerate({
            cookId: idCreate(),
            currentBiography: 'Bio',
            requestingSession,
            serverRuntime,
        });

        // Assert
        await expect(pending).rejects.toThrow(/cook user not found/);
        expect(generateText).not.toHaveBeenCalled();
    });

    it('does not record an AiGeneration when the model throws', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({
            firstName: 'Cleo',
            lastName: 'Throw',
        });
        await testDb.insert(cooks).values({ cookId: user.userId });
        vi.mocked(generateText).mockRejectedValue(new Error('model down'));

        // Act
        const pending = cookBiographySuggestGenerate({
            cookId: user.userId,
            currentBiography: 'Vorhanden',
            requestingSession,
            serverRuntime,
        });

        // Assert
        await expect(pending).rejects.toThrow(/model down/);
        await serverRuntime.aiGenerations.drain();
        const rows = await testDb.select().from(aiGenerations).where(eq(aiGenerations.userId, user.userId));
        expect(rows).toHaveLength(0);
    });
});
