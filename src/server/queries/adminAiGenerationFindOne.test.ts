import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { aiGenerations } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminAiGenerationFindOne } from './adminAiGenerationFindOne';

describe('adminAiGenerationFindOne', () => {
    it('returns the mapped generation', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'Ai', lastName: 'One' });
        const aiGenerationId = idCreate();
        const createdAt = new Date('2037-04-01T12:00:00.000Z');
        await testDb.insert(aiGenerations).values({
            aiGenerationId,
            kind: 'CHAT_TITLE',
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            modelId: 'model-x',
            system: 'system text',
            prompt: 'prompt text',
            output: 'output text',
            inputTokens: 3,
            outputTokens: 4,
            totalTokens: 7,
            reasoningTokens: 1,
            cachedInputTokens: 2,
            createdAt,
        });

        // Act
        const found = await adminAiGenerationFindOne({ aiGenerationId }, setup.requestingSession, setup.serverRuntime);

        // Assert
        expect(found).toMatchObject({
            aiGenerationId,
            kind: 'CHAT_TITLE',
            userId: setup.user.userId,
            sessionId: setup.requestingSession.sessionId,
            modelId: 'model-x',
            system: 'system text',
            prompt: 'prompt text',
            output: 'output text',
            inputTokens: 3,
            outputTokens: 4,
            totalTokens: 7,
            reasoningTokens: 1,
            cachedInputTokens: 2,
        });
        expect(found?.createdAt).toEqual(createdAt);
    });

    it('returns null when the id is unknown', async () => {
        // Arrange
        const setup = await commandSetup();

        // Act
        const found = await adminAiGenerationFindOne({ aiGenerationId: idCreate() }, setup.requestingSession, setup.serverRuntime);

        // Assert
        expect(found).toBeNull();
    });
});
