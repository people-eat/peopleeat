import { generateText } from 'ai';
import type * as AiModule from 'ai';
import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { aiGenerations, cooks, meals } from '../db/schema';
import { commandSetup, cookMutationParent, findLogsForSession, testDb } from '../test/commandTestUtils';
import { cookMenuTitleDescriptionSuggest } from './cookMenuTitleDescriptionSuggest';

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

describe('cookMenuTitleDescriptionSuggest', () => {
    beforeEach(() => {
        vi.mocked(generateText).mockReset();
    });

    it('returns a normalized title and description and records an AiGeneration', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Ada', lastName: 'Title' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        const mealId = idCreate();
        await testDb.insert(meals).values({
            mealId,
            cookId: user.userId,
            title: 'Tomatensuppe',
            description: 'Reife Tomaten',
        });
        vi.mocked(generateText).mockResolvedValue(
            modelObject({ title: '  sommer menü  ', description: '  ich koche mit frischen kräutern.  ' }, 'mock-title'),
        );

        // Act
        const result = await cookMenuTitleDescriptionSuggest(
            cookMutationParent(user.userId),
            {
                currentTitle: 'Altes Menü',
                currentDescription: 'Gäste sollen satt werden.',
                courses: [{ title: 'Vorspeise', mealIds: [mealId] }],
            },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result).toEqual({
            title: 'Sommer menü',
            description: 'Ich koche mit frischen kräutern.',
            courses: [],
        });
        const call = vi.mocked(generateText).mock.calls[0]?.[0] as { prompt: string; instructions: string };
        expect(call.prompt).toContain('Gäste sollen satt werden.');
        expect(call.instructions).toContain('Altes Menü');
        expect(call.instructions).toContain('Tomatensuppe');
        expect(call.instructions).toContain('Reife Tomaten');

        const mealRows = await testDb.select().from(meals).where(eq(meals.cookId, user.userId));
        expect(mealRows).toHaveLength(1);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();

        await serverRuntime.aiGenerations.drain();
        const [generation] = await testDb
            .select()
            .from(aiGenerations)
            .where(and(eq(aiGenerations.kind, 'COOK_MENU_TITLE_DESCRIPTION'), eq(aiGenerations.userId, user.userId)));
        expect(generation?.sessionId).toBe(requestingSession.sessionId);
        expect(generation?.modelId).toBe('mock-title');
        expect(generation?.output).toContain('sommer menü');
        expect(generation?.inputTokens).toBe(11);
        expect(generation?.outputTokens).toBe(7);
        expect(generation?.totalTokens).toBe(18);
        expect(generation?.reasoningTokens).toBe(2);
        expect(generation?.cachedInputTokens).toBe(3);
    });

    it('uses the fallback prompt when title, description, and courses are empty', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Bea', lastName: 'Empty' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        vi.mocked(generateText).mockResolvedValue(
            modelObject({ title: 'Neues Menü', description: 'Ich koche für euch.' }, 'mock-title-empty'),
        );

        // Act
        const result = await cookMenuTitleDescriptionSuggest(
            cookMutationParent(user.userId),
            { currentTitle: '   ', currentDescription: null, courses: [] },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(result.title).toBe('Neues Menü');
        const call = vi.mocked(generateText).mock.calls[0]?.[0] as { prompt: string; instructions: string };
        expect(call.prompt).toBe('Schlage einen passenden Menünamen und eine Beschreibung vor.');
        expect(call.instructions).not.toContain('Der aktuelle Name des Menüs');
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();

        await serverRuntime.aiGenerations.drain();
        const [generation] = await testDb
            .select()
            .from(aiGenerations)
            .where(and(eq(aiGenerations.kind, 'COOK_MENU_TITLE_DESCRIPTION'), eq(aiGenerations.userId, user.userId)));
        expect(generation?.modelId).toBe('mock-title-empty');
    });

    it('falls back to the meal id when the meal row is missing', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Cleo', lastName: 'Missing' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        const missingMealId = idCreate();
        vi.mocked(generateText).mockResolvedValue(modelObject({ title: 'Menü', description: 'Ich koche.' }, 'mock-title-missing'));

        // Act
        await cookMenuTitleDescriptionSuggest(
            cookMutationParent(user.userId),
            { courses: [{ title: 'Gang', mealIds: [missingMealId] }] },
            requestingSession,
            serverRuntime,
        );

        // Assert
        const call = vi.mocked(generateText).mock.calls[0]?.[0] as { instructions: string };
        expect(call.instructions).toContain(missingMealId);
        const mealRows = await testDb.select().from(meals).where(eq(meals.cookId, user.userId));
        expect(mealRows).toHaveLength(0);
    });

    it('logs and rethrows when the model throws', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser({ firstName: 'Dora', lastName: 'Throw' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        vi.mocked(generateText).mockRejectedValue(new Error('model down'));

        // Act
        const pending = cookMenuTitleDescriptionSuggest(cookMutationParent(user.userId), { courses: [] }, requestingSession, serverRuntime);

        // Assert
        await expect(pending).rejects.toThrow(/model down/);
        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        await serverRuntime.aiGenerations.drain();
        const generations = await testDb.select().from(aiGenerations).where(eq(aiGenerations.userId, user.userId));
        expect(generations).toHaveLength(0);
        const logs = await findLogsForSession(requestingSession.sessionId);
        expect(logs.some((row) => row.level === 'error' && row.message.includes('model down'))).toBe(true);
    });
});
