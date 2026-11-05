import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { aiGenerations } from '../db/schema';
import type { AiGenerationKind } from '../domain/aiGeneration';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminAiGenerationCounts } from './adminAiGenerationCounts';
import { adminAiGenerationFindMany } from './adminAiGenerationFindMany';

async function insertGeneration(args: {
    userId: string;
    sessionId: string;
    kind: AiGenerationKind;
    token: string;
    system?: string;
    prompt?: string;
    output?: string;
    totalTokens?: number;
    createdAt?: Date;
    modelId?: string;
}) {
    const aiGenerationId = idCreate();
    await testDb.insert(aiGenerations).values({
        aiGenerationId,
        kind: args.kind,
        userId: args.userId,
        sessionId: args.sessionId,
        modelId: args.modelId ?? 'test-model',
        system: args.system ?? `system ${args.token}`,
        prompt: args.prompt ?? `prompt ${args.token}`,
        output: args.output ?? `output ${args.token}`,
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: args.totalTokens ?? 2,
        createdAt: args.createdAt,
    });
    return aiGenerationId;
}

describe('adminAiGenerationFindMany', () => {
    it('orders by createdAt descending by default', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'Ai', lastName: 'Order' });
        const token = idCreate();
        const olderId = await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'CHAT_TITLE',
            token,
            createdAt: new Date('2035-01-01T00:00:00.000Z'),
        });
        const newerId = await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'CHAT_TITLE',
            token,
            createdAt: new Date('2035-03-01T00:00:00.000Z'),
        });

        // Act
        const rows = await adminAiGenerationFindMany(
            { criterion: { kinds: ['CHAT_TITLE'], searchText: token, skip: 0, take: 10 } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.aiGenerationId)).toEqual([newerId, olderId]);
    });

    it('orders by totalTokens ascending when asked', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'Ai', lastName: 'Tokens' });
        const token = idCreate();
        const lowId = await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'CHAT_TITLE',
            token,
            totalTokens: 5,
        });
        const highId = await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'CHAT_TITLE',
            token,
            totalTokens: 50,
        });
        const midId = await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'CHAT_TITLE',
            token,
            totalTokens: 20,
        });

        // Act
        const rows = await adminAiGenerationFindMany(
            {
                criterion: {
                    kinds: ['CHAT_TITLE'],
                    searchText: token,
                    skip: 0,
                    take: 10,
                    sortField: 'totalTokens',
                    sortDirection: 'ASC',
                },
            },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.aiGenerationId)).toEqual([lowId, midId, highId]);
    });

    it('orders by kind ascending when asked', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'Ai', lastName: 'Kind' });
        const token = idCreate();
        const cookId = await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'COOK_BIOGRAPHY_SUMMARY',
            token,
        });
        const chatId = await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'CHAT_TITLE',
            token,
        });

        // Act
        const rows = await adminAiGenerationFindMany(
            {
                criterion: {
                    kinds: ['CHAT_TITLE', 'COOK_BIOGRAPHY_SUMMARY'],
                    searchText: token,
                    skip: 0,
                    take: 10,
                    sortField: 'kind',
                    sortDirection: 'ASC',
                },
            },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.aiGenerationId)).toEqual([chatId, cookId]);
    });

    it('filters by kind', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'Ai', lastName: 'Filter' });
        const token = idCreate();
        const chatId = await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'CHAT_TITLE',
            token,
        });
        await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'COOK_BIOGRAPHY_SUMMARY',
            token,
        });

        // Act
        const rows = await adminAiGenerationFindMany(
            { criterion: { kinds: ['CHAT_TITLE'], searchText: token, skip: 0, take: 10 } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.aiGenerationId)).toEqual([chatId]);
    });

    it('filters searchText across system, prompt, and output', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'Ai', lastName: 'Search' });
        const token = idCreate();
        const systemId = await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'CHAT_TITLE',
            token,
            system: `system ${token}`,
            prompt: 'unrelated prompt',
            output: 'unrelated output',
        });
        const promptId = await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'CHAT_TITLE',
            token,
            system: 'unrelated system',
            prompt: `prompt ${token}`,
            output: 'unrelated output',
        });
        const outputId = await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'CHAT_TITLE',
            token,
            system: 'unrelated system',
            prompt: 'unrelated prompt',
            output: `output ${token}`,
        });
        const missId = await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'CHAT_TITLE',
            token: 'other',
            system: 'unrelated system',
            prompt: 'unrelated prompt',
            output: 'unrelated output',
        });

        // Act
        const rows = await adminAiGenerationFindMany(
            { criterion: { kinds: ['CHAT_TITLE'], searchText: token, skip: 0, take: 10 } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.aiGenerationId).sort()).toEqual([systemId, promptId, outputId].sort());
        expect(rows.some((row) => row.aiGenerationId === missId)).toBe(false);
    });

    it('applies skip and take', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'Ai', lastName: 'Page' });
        const token = idCreate();
        await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'CHAT_TITLE',
            token,
            createdAt: new Date('2036-01-01T00:00:00.000Z'),
        });
        const middleId = await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'CHAT_TITLE',
            token,
            createdAt: new Date('2036-02-01T00:00:00.000Z'),
        });
        await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'CHAT_TITLE',
            token,
            createdAt: new Date('2036-03-01T00:00:00.000Z'),
        });

        // Act
        const rows = await adminAiGenerationFindMany(
            { criterion: { kinds: ['CHAT_TITLE'], searchText: token, skip: 1, take: 1 } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.aiGenerationId)).toEqual([middleId]);
    });

    it('returns an empty list when kinds is empty', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'Ai', lastName: 'Empty' });
        const token = idCreate();
        await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'CHAT_TITLE',
            token,
        });

        // Act
        const rows = await adminAiGenerationFindMany(
            { criterion: { kinds: [], searchText: token, skip: 0, take: 10 } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(rows).toEqual([]);
    });
});

describe('adminAiGenerationCounts', () => {
    it('returns one count per criterion using the same filters as find many', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'Ai', lastName: 'Counts' });
        const token = idCreate();
        await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'CHAT_TITLE',
            token,
        });
        await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'CHAT_TITLE',
            token,
        });
        await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'COOK_BIOGRAPHY_SUMMARY',
            token,
        });
        await insertGeneration({
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            kind: 'CHAT_TITLE',
            token: 'plain',
            system: 'unrelated system',
            prompt: 'unrelated prompt',
            output: 'unrelated output',
        });

        // Act
        const [chatTitles, matchingSearch, biography, none] = await adminAiGenerationCounts(
            {
                criteria: [
                    { kinds: ['CHAT_TITLE'], searchText: token, skip: 0, take: 10 },
                    { kinds: ['CHAT_TITLE', 'COOK_BIOGRAPHY_SUMMARY'], searchText: token, skip: 0, take: 10 },
                    { kinds: ['COOK_BIOGRAPHY_SUMMARY'], searchText: token, skip: 0, take: 10 },
                    { kinds: [], searchText: token, skip: 0, take: 10 },
                ],
            },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(chatTitles).toBe(2);
        expect(matchingSearch).toBe(3);
        expect(biography).toBe(1);
        expect(none).toBe(0);
    });

    it('rejects an empty criteria list', async () => {
        // Arrange
        const setup = await commandSetup();

        // Act / Assert
        await expect(adminAiGenerationCounts({ criteria: [] }, setup.requestingSession, setup.serverRuntime)).rejects.toThrow(
            /criteria must not be empty/,
        );
    });

    it('rejects more than twenty criteria', async () => {
        // Arrange
        const setup = await commandSetup();

        // Act / Assert
        await expect(
            adminAiGenerationCounts(
                { criteria: Array.from({ length: 21 }, () => ({ kinds: [] })) },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow(/too many criteria/);
    });
});
