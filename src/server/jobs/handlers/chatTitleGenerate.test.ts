import { generateText } from 'ai';
import type * as AiModule from 'ai';
import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../../shared/idCreate';
import { chatMessages, chats, chatTurns } from '../../db/schema';
import { commandSetup, testDb } from '../../test/commandTestUtils';
import { chatTitleGenerate } from './chatTitleGenerate';

vi.mock('ai', async (importOriginal) => {
    const actual = await importOriginal<typeof AiModule>();
    return {
        ...actual,
        generateText: vi.fn(),
    };
});

async function seedChatWithCompleteFirstTurn(options?: { title?: string; includeAssistant?: boolean }) {
    const setup = await commandSetup.withUser({ firstName: 'Chat', lastName: 'Owner' });
    const chatId = idCreate();
    const chatTurnId = idCreate();
    const userMessageId = idCreate();
    const assistantMessageId = idCreate();

    await testDb.insert(chats).values({
        chatId,
        userId: setup.user.userId,
        surface: 'customer',
        title: options?.title ?? '',
    });
    await testDb.insert(chatTurns).values({
        chatTurnId,
        chatId,
        clientRequestId: idCreate(),
        status: 'complete',
        completedAt: new Date(),
    });
    await testDb.insert(chatMessages).values({
        chatMessageId: userMessageId,
        chatTurnId,
        role: 'user',
        status: 'complete',
        body: {
            id: userMessageId,
            role: 'user',
            parts: [{ type: 'text', text: 'I need a chef for a birthday dinner in Berlin', state: 'done' }],
        },
    });
    if (options?.includeAssistant !== false) {
        await testDb.insert(chatMessages).values({
            chatMessageId: assistantMessageId,
            chatTurnId,
            role: 'assistant',
            status: 'complete',
            body: {
                id: assistantMessageId,
                role: 'assistant',
                parts: [{ type: 'text', text: 'I can help you find a private chef for that celebration.', state: 'done' }],
            },
        });
    }

    return { setup, chatId, userId: setup.user.userId };
}

function mockGenerateTitle(title: string) {
    vi.mocked(generateText).mockResolvedValue({
        output: { title },
        usage: {
            inputTokens: 10,
            outputTokens: 5,
            totalTokens: 15,
            inputTokenDetails: {},
            outputTokenDetails: {},
        },
        finalStep: { response: { modelId: 'mock-titler' } },
    } as never);
}

describe('chatTitleGenerate', () => {
    it('sets a title from the first complete turn and publishes', async () => {
        // Arrange
        const { setup, chatId, userId } = await seedChatWithCompleteFirstTurn();
        mockGenerateTitle('Birthday dinner Berlin');

        // Act
        await chatTitleGenerate.handler({
            data: { chatId },
            serverRuntime: setup.serverRuntime,
        });

        // Assert
        const [row] = await testDb.select().from(chats).where(eq(chats.chatId, chatId));
        expect(row?.title).toBe('Birthday dinner Berlin');
        expect(setup.serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId });
    });

    it('skips when the chat already has a title', async () => {
        // Arrange
        const { setup, chatId } = await seedChatWithCompleteFirstTurn({ title: 'Existing title' });
        vi.mocked(generateText).mockClear();

        // Act
        await chatTitleGenerate.handler({
            data: { chatId },
            serverRuntime: setup.serverRuntime,
        });

        // Assert
        const [row] = await testDb.select().from(chats).where(eq(chats.chatId, chatId));
        expect(row?.title).toBe('Existing title');
        expect(generateText).not.toHaveBeenCalled();
        expect(setup.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('skips persist when the model returns NONE', async () => {
        // Arrange
        const { setup, chatId } = await seedChatWithCompleteFirstTurn();
        mockGenerateTitle('NONE');

        // Act
        await chatTitleGenerate.handler({
            data: { chatId },
            serverRuntime: setup.serverRuntime,
        });

        // Assert
        const [row] = await testDb.select().from(chats).where(eq(chats.chatId, chatId));
        expect(row?.title).toBe('');
        expect(setup.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });

    it('skips persist when the model returns an empty title', async () => {
        // Arrange
        const { setup, chatId } = await seedChatWithCompleteFirstTurn();
        mockGenerateTitle('   ');

        // Act
        await chatTitleGenerate.handler({
            data: { chatId },
            serverRuntime: setup.serverRuntime,
        });

        // Assert
        const [row] = await testDb.select().from(chats).where(eq(chats.chatId, chatId));
        expect(row?.title).toBe('');
        expect(setup.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });
});
