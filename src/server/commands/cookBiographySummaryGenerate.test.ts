import { generateText } from 'ai';
import type * as AiModule from 'ai';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { aiGenerations, cooks, meals } from '../db/schema';
import { commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { cookBiographySummaryGenerate } from './cookBiographySummaryGenerate';

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

describe('cookBiographySummaryGenerate', () => {
    beforeEach(() => {
        vi.mocked(generateText).mockReset();
    });

    it('returns null and does not call the model when the biography is blank', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Blank' });
        await testDb.insert(cooks).values({ cookId: user.userId, biographySummary: 'Unchanged' });

        // Act
        const result = await cookBiographySummaryGenerate({
            cookId: user.userId,
            biography: '   ',
            requestingSession,
            serverRuntime,
        });

        // Assert
        expect(result).toBeNull();
        expect(generateText).not.toHaveBeenCalled();
        const [cook] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(cook?.biographySummary).toBe('Unchanged');
        await serverRuntime.aiGenerations.drain();
        const rows = await testDb.select().from(aiGenerations).where(eq(aiGenerations.userId, user.userId));
        expect(rows).toHaveLength(0);
        const logs = await findLogsForSession(requestingSession.sessionId);
        expect(logs.filter((row) => row.level === 'error')).toHaveLength(0);
    });

    it('records an AiGeneration from the cook profile and live meals', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Roland', lastName: 'Summary' });
        await testDb.insert(cooks).values({
            cookId: user.userId,
            biographySummary: '',
            cuisineStyle: 'Hotels in den Alpen',
            cookingPhilosophy: 'Gastfreundschaft',
        });
        await testDb.insert(meals).values([
            {
                mealId: idCreate(),
                cookId: user.userId,
                title: 'Alpenforelle',
                description: '',
            },
            {
                mealId: idCreate(),
                cookId: user.userId,
                title: 'Gestrichenes Gericht',
                description: 'Weg',
                deletedAt: new Date(),
            },
        ]);
        vi.mocked(generateText).mockResolvedValue(
            modelObject(
                {
                    biography: 'Roland arbeitete in einem 4*-Hotel in Saalbach.',
                    biographySummary: '  Roland kochte in Saalbach.  ',
                },
                'mock-summary',
            ),
        );

        // Act
        const result = await cookBiographySummaryGenerate({
            cookId: user.userId,
            biography: 'Roland arbeitete in einem 4*-Hotel in Saalbach.',
            requestingSession,
            serverRuntime,
        });

        // Assert
        expect(result).toEqual({
            biography: 'Roland arbeitete in einem 4*-Hotel in Saalbach.',
            biographySummary: 'Roland kochte in Saalbach.',
        });
        const call = vi.mocked(generateText).mock.calls[0]?.[0] as { prompt: string; instructions: string };
        expect(call.instructions).toContain('Telefonnummern');
        expect(call.prompt).toContain('Roland');
        expect(call.prompt).toContain('4*-Hotel in Saalbach');
        expect(call.prompt).toContain('Hotels in den Alpen');
        expect(call.prompt).toContain('Gastfreundschaft');
        expect(call.prompt).toContain('Alpenforelle');
        expect(call.prompt).toContain('Beschreibung: "Keine"');
        expect(call.prompt).not.toContain('Gestrichenes Gericht');

        const [cook] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(cook?.biographySummary).toBe('');

        await serverRuntime.aiGenerations.drain();
        const [generation] = await testDb
            .select()
            .from(aiGenerations)
            .where(and(eq(aiGenerations.kind, 'COOK_BIOGRAPHY_SUMMARY'), eq(aiGenerations.userId, user.userId)));
        expect(generation?.sessionId).toBe(requestingSession.sessionId);
        expect(generation?.modelId).toBe('mock-summary');
        expect(generation?.output).toContain('Roland kochte in Saalbach.');
        expect(generation?.inputTokens).toBe(11);
        expect(generation?.outputTokens).toBe(7);
        expect(generation?.totalTokens).toBe(18);
        expect(generation?.reasoningTokens).toBe(2);
        expect(generation?.cachedInputTokens).toBe(3);
    });

    it('prefers explicit cuisine and philosophy over the cook row', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Salvatore', lastName: 'Override' });
        await testDb.insert(cooks).values({
            cookId: user.userId,
            cuisineStyle: 'Stored cuisine',
            cookingPhilosophy: 'Stored philosophy',
        });
        vi.mocked(generateText).mockResolvedValue(
            modelObject({ biography: 'Stationen in Rom.', biographySummary: 'Salvatore kochte in Rom.' }, 'mock-summary-override'),
        );

        // Act
        const result = await cookBiographySummaryGenerate({
            cookId: user.userId,
            biography: 'Stationen in Rom.',
            cuisineStyle: 'Passed cuisine',
            cookingPhilosophy: null,
            requestingSession,
            serverRuntime,
        });

        // Assert
        expect(result).toEqual({
            biography: 'Stationen in Rom.',
            biographySummary: 'Salvatore kochte in Rom.',
        });
        const call = vi.mocked(generateText).mock.calls[0]?.[0] as { prompt: string };
        expect(call.prompt).toContain('Passed cuisine');
        expect(call.prompt).toContain('## Kochphilosophie\nKeine');
        expect(call.prompt).not.toContain('Stored cuisine');
        expect(call.prompt).not.toContain('Stored philosophy');
        expect(call.prompt).toContain('Keine Gerichte hinterlegt.');
    });

    it('returns null and logs when the model throws', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Nora', lastName: 'Throw' });
        await testDb.insert(cooks).values({ cookId: user.userId, biographySummary: 'Keep' });
        vi.mocked(generateText).mockRejectedValue(new Error('model down'));

        // Act
        const result = await cookBiographySummaryGenerate({
            cookId: user.userId,
            biography: 'Eine Biografie.',
            requestingSession,
            serverRuntime,
        });

        // Assert
        expect(result).toBeNull();
        const [cook] = await testDb.select().from(cooks).where(eq(cooks.cookId, user.userId));
        expect(cook?.biographySummary).toBe('Keep');
        await serverRuntime.aiGenerations.drain();
        const rows = await testDb.select().from(aiGenerations).where(eq(aiGenerations.userId, user.userId));
        expect(rows).toHaveLength(0);
        const logs = await findLogsForSession(requestingSession.sessionId);
        expect(logs.some((row) => row.level === 'error' && row.message.includes('model down'))).toBe(true);
    });

    it('strips leftover contact from the model output', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Lia', lastName: 'Contact' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        vi.mocked(generateText).mockResolvedValue(
            modelObject(
                {
                    biography: 'Lia kocht in Berlin. chef@example.com',
                    biographySummary: 'Lia kocht in Berlin. +49 151 12345678',
                },
                'mock-summary-contact',
            ),
        );

        const result = await cookBiographySummaryGenerate({
            cookId: user.userId,
            biography: 'Lia kocht in Berlin. Ruf mich unter null eins fünf an.',
            requestingSession,
            serverRuntime,
        });

        expect(result).toEqual({
            biography: 'Lia kocht in Berlin.',
            biographySummary: 'Lia kocht in Berlin.',
        });
    });
});
