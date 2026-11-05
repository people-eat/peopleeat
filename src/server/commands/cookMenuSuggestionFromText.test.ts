import { generateText } from 'ai';
import type * as AiModule from 'ai';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { aiGenerations, cooks, meals } from '../db/schema';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { cookMenuSuggestionFromText } from './cookMenuSuggestionFromText';

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

describe('cookMenuSuggestionFromText', () => {
    beforeEach(() => {
        vi.mocked(generateText).mockReset();
    });

    it('inserts new draft meals, reuses existing meals, and records an AiGeneration', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Text' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        const existingMealId = idCreate();
        await testDb.insert(meals).values({
            mealId: existingMealId,
            cookId: user.userId,
            title: 'Tomatensuppe',
            description: 'Tomaten',
            publishedAt: new Date('2030-01-01T00:00:00.000Z'),
        });
        vi.mocked(generateText).mockResolvedValue(
            modelObject(
                {
                    title: '  sommer menü  ',
                    courses: [
                        {
                            title: '  vorspeise  ',
                            mealOptions: [
                                { type: 'EXISTING_MEAL', mealId: existingMealId, title: null, description: null },
                                { type: 'NEW_MEAL', mealId: null, title: '  gegrillter fisch  ', description: '  mit zitrone.  ' },
                            ],
                        },
                    ],
                },
                'mock-from-text',
            ),
        );

        // Act
        const result = await cookMenuSuggestionFromText(
            cookMutationParent(user.userId),
            { text: 'Vorspeise Tomatensuppe, danach gegrillter Fisch.' },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result.title).toBe('Sommer menü');
        expect(result.description).toBe('');
        expect(result.courses).toHaveLength(1);
        expect(result.courses[0]?.title).toBe('Vorspeise');
        expect(result.courses[0]?.mealIds).toHaveLength(2);
        expect(result.courses[0]?.mealIds[0]).toBe(existingMealId);

        const mealRows = await testDb.select().from(meals).where(eq(meals.cookId, user.userId));
        expect(mealRows).toHaveLength(2);
        const created = mealRows.find((meal) => meal.mealId !== existingMealId);
        expect(created?.title).toBe('Gegrillter fisch');
        expect(created?.description).toBe('Mit zitrone.');
        expect(created?.publishedAt).toBeNull();
        expect(created?.deletedAt).toBeNull();
        expect(result.courses[0]?.mealIds[1]).toBe(created?.mealId);

        const call = vi.mocked(generateText).mock.calls[0]?.[0] as { prompt: string };
        expect(call.prompt).toContain('Tomatensuppe');
        expect(call.prompt).toContain('Vorspeise Tomatensuppe, danach gegrillter Fisch.');

        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledTimes(1);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
        expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();

        await serverRuntime.aiGenerations.drain();
        const [generation] = await testDb
            .select()
            .from(aiGenerations)
            .where(and(eq(aiGenerations.kind, 'COOK_MENU_SUGGESTION_FROM_TEXT'), eq(aiGenerations.userId, user.userId)));
        expect(generation?.sessionId).toBe(requestingSession.sessionId);
        expect(generation?.modelId).toBe('mock-from-text');
        expect(generation?.output).toContain('sommer menü');
        expect(generation?.inputTokens).toBe(11);
        expect(generation?.outputTokens).toBe(7);
        expect(generation?.totalTokens).toBe(18);
        expect(generation?.reasoningTokens).toBe(2);
        expect(generation?.cachedInputTokens).toBe(3);
    });

    it('does not insert or publish when every option is an existing meal', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Bea', lastName: 'Reuse' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        const existingMealId = idCreate();
        await testDb.insert(meals).values({
            mealId: existingMealId,
            cookId: user.userId,
            title: 'Risotto',
            description: 'Reis',
        });
        vi.mocked(generateText).mockResolvedValue(
            modelObject(
                {
                    title: 'Risotto Menü',
                    courses: [
                        {
                            title: 'Hauptgang',
                            mealOptions: [{ type: 'EXISTING_MEAL', mealId: existingMealId, title: null, description: null }],
                        },
                    ],
                },
                'mock-from-text-existing',
            ),
        );

        // Act
        const result = await cookMenuSuggestionFromText(
            cookMutationParent(user.userId),
            { text: 'Nur Risotto.' },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result).toEqual({
            title: 'Risotto Menü',
            description: '',
            courses: [{ title: 'Hauptgang', mealIds: [existingMealId] }],
        });
        const mealRows = await testDb.select().from(meals).where(eq(meals.cookId, user.userId));
        expect(mealRows).toHaveLength(1);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();

        await serverRuntime.aiGenerations.drain();
        const [generation] = await testDb
            .select()
            .from(aiGenerations)
            .where(and(eq(aiGenerations.kind, 'COOK_MENU_SUGGESTION_FROM_TEXT'), eq(aiGenerations.userId, user.userId)));
        expect(generation?.modelId).toBe('mock-from-text-existing');
    });

    it('skips unknown existing meals and incomplete new meals', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Cleo', lastName: 'Skip' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        vi.mocked(generateText).mockResolvedValue(
            modelObject(
                {
                    title: 'Lücken Menü',
                    courses: [
                        {
                            title: 'zwischengang',
                            mealOptions: [
                                { type: 'EXISTING_MEAL', mealId: idCreate(), title: null, description: null },
                                { type: 'NEW_MEAL', mealId: null, title: 'Nur Titel', description: null },
                                { type: 'NEW_MEAL', mealId: null, title: null, description: 'Nur Beschreibung' },
                            ],
                        },
                    ],
                },
                'mock-from-text-skip',
            ),
        );

        // Act
        const result = await cookMenuSuggestionFromText(
            cookMutationParent(user.userId),
            { text: 'Unvollständig.' },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result).toEqual({
            title: 'Lücken Menü',
            description: '',
            courses: [{ title: 'Zwischengang', mealIds: [] }],
        });
        const mealRows = await testDb.select().from(meals).where(eq(meals.cookId, user.userId));
        expect(mealRows).toHaveLength(0);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();

        await serverRuntime.aiGenerations.drain();
        const rows = await testDb
            .select()
            .from(aiGenerations)
            .where(and(eq(aiGenerations.kind, 'COOK_MENU_SUGGESTION_FROM_TEXT'), eq(aiGenerations.userId, user.userId)));
        expect(rows).toHaveLength(1);
    });

    it('logs and rethrows when the model throws, leaving meals unchanged', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Dora', lastName: 'Throw' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        const existingMealId = idCreate();
        await testDb.insert(meals).values({
            mealId: existingMealId,
            cookId: user.userId,
            title: 'Suppe',
            description: 'Klar',
        });
        vi.mocked(generateText).mockRejectedValue(new Error('model down'));

        // Act
        const pending = cookMenuSuggestionFromText(
            cookMutationParent(user.userId),
            { text: 'Ein Menü.' },
            requestingSession,
            serverRuntime,
        );

        // Assert
        await expect(pending).rejects.toThrow(/model down/);
        const mealRows = await testDb.select().from(meals).where(eq(meals.cookId, user.userId));
        expect(mealRows.map((meal) => meal.mealId)).toEqual([existingMealId]);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        await serverRuntime.aiGenerations.drain();
        const generations = await testDb.select().from(aiGenerations).where(eq(aiGenerations.userId, user.userId));
        expect(generations).toHaveLength(0);
        const logs = await findLogsForSession(requestingSession.sessionId);
        expect(logs.some((row) => row.level === 'error' && row.message.includes('model down'))).toBe(true);
    });
});
