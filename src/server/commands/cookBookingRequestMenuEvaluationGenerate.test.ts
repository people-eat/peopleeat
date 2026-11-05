import { generateText } from 'ai';
import type * as AiModule from 'ai';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { aiGenerations } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookBookingRequestMenuEvaluationGenerate } from './cookBookingRequestMenuEvaluationGenerate';

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

describe('cookBookingRequestMenuEvaluationGenerate', () => {
    beforeEach(() => {
        vi.mocked(generateText).mockReset();
    });

    it('returns the empty-inventory message and does not call the model', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Empty' });

        // Act
        const result = await cookBookingRequestMenuEvaluationGenerate({
            cookId: user.userId,
            bookingRequestContext: 'Geburtstag in Berlin',
            menus: [],
            requestingSession,
            serverRuntime,
        });

        // Assert
        expect(result).toEqual({
            evaluationSummary: 'Du hast noch keine Menüs. Stelle eines aus deinen Gerichten zusammen, das zur Anfrage passt.',
            menus: [],
        });
        expect(generateText).not.toHaveBeenCalled();
        await serverRuntime.aiGenerations.drain();
        const rows = await testDb.select().from(aiGenerations).where(eq(aiGenerations.userId, user.userId));
        expect(rows).toHaveLength(0);
    });

    it('records an AiGeneration and drops menu ids that were not in the input', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Bea', lastName: 'Rank' });
        const menuId = idCreate();
        vi.mocked(generateText).mockResolvedValue(
            modelObject(
                {
                    evaluationSummary: 'Das Sommer-Menü passt.',
                    menus: [
                        { menuId, evaluationSummary: 'Leicht und passend.', isSuitable: true },
                        { menuId: idCreate(), evaluationSummary: 'Unbekannt.', isSuitable: false },
                    ],
                },
                'mock-evaluation',
            ),
        );

        // Act
        const result = await cookBookingRequestMenuEvaluationGenerate({
            cookId: user.userId,
            bookingRequestContext: 'Geburtstag in Berlin',
            menus: [
                {
                    menuId,
                    title: 'Sommer',
                    description: 'Leicht',
                    courses: [{ title: 'Vorspeise', mealOptions: [{ title: 'Suppe', description: '' }] }],
                },
            ],
            requestingSession,
            serverRuntime,
        });

        // Assert
        expect(result).toEqual({
            evaluationSummary: 'Das Sommer-Menü passt.',
            menus: [{ menuId, evaluationSummary: 'Leicht und passend.', isSuitable: true }],
        });
        const call = vi.mocked(generateText).mock.calls[0]?.[0] as { prompt: string };
        expect(call.prompt).toContain('Geburtstag in Berlin');
        expect(call.prompt).toContain(menuId);
        expect(call.prompt).toContain('Suppe');
        expect(call.prompt).toContain('Keine');

        await serverRuntime.aiGenerations.drain();
        const [generation] = await testDb
            .select()
            .from(aiGenerations)
            .where(and(eq(aiGenerations.kind, 'BOOKING_REQUEST_COOK_MENU_EVALUATION'), eq(aiGenerations.userId, user.userId)));
        expect(generation?.sessionId).toBe(requestingSession.sessionId);
        expect(generation?.modelId).toBe('mock-evaluation');
        expect(generation?.output).toContain('Das Sommer-Menü passt.');
        expect(generation?.inputTokens).toBe(11);
        expect(generation?.outputTokens).toBe(7);
        expect(generation?.totalTokens).toBe(18);
        expect(generation?.reasoningTokens).toBe(2);
        expect(generation?.cachedInputTokens).toBe(3);
    });

    it('does not record an AiGeneration when the model throws', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Cleo', lastName: 'Throw' });
        vi.mocked(generateText).mockRejectedValue(new Error('model down'));

        // Act
        const pending = cookBookingRequestMenuEvaluationGenerate({
            cookId: user.userId,
            bookingRequestContext: 'Geburtstag',
            menus: [
                {
                    menuId: idCreate(),
                    title: 'Sommer',
                    description: '',
                    courses: [],
                },
            ],
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
