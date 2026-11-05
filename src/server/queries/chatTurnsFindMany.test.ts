import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, chatMessages, chatMessageUserAttachments, chats, chatTurns, fileUploads } from '../db/schema';
import type { ChatMessageBody } from '../domain/chatMessageBody';
import { chatDebugEnabled } from '../mappers/toGqlChatTurn';
import { toGqlFileUpload } from '../mappers/toGqlFileUpload';
import { commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { chatTurnsFindMany } from './chatTurnsFindMany';

async function seedChat(userId: string) {
    const chatId = idCreate();
    await testDb.insert(chats).values({
        chatId,
        userId,
        surface: 'customer',
        title: 'Turns',
    });
    return chatId;
}

async function insertFileUpload(userId: string, filename: string) {
    const fileUploadId = idCreate();
    await testDb.insert(fileUploads).values({
        fileUploadId,
        userId,
        filename,
        mediaType: 'text/plain',
        size: 4,
        bytes: Buffer.from('file'),
    });
    return fileUploadId;
}

describe('chatTurnsFindMany', () => {
    it('returns the owner turns in sequence order with attachments and debug gated by the environment', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        const chatId = await seedChat(user.userId);
        const startedAt = new Date('2026-03-01T00:00:00.000Z');
        const completedAt = new Date('2026-03-01T00:05:00.000Z');
        const firstTurnId = idCreate();
        const secondTurnId = idCreate();
        const userMessageId = idCreate();
        const assistantMessageId = idCreate();
        const secondUserMessageId = idCreate();
        const secondAssistantMessageId = idCreate();
        const toolCallId = idCreate();
        const laterFileId = await insertFileUpload(user.userId, 'later.txt');
        const earlierFileId = await insertFileUpload(user.userId, 'earlier.txt');
        const assistantFileId = await insertFileUpload(user.userId, 'assistant.txt');
        const includeDebug = chatDebugEnabled();

        await testDb.insert(chatTurns).values({
            chatTurnId: firstTurnId,
            chatId,
            clientRequestId: idCreate(),
            status: 'complete',
            revision: 2,
            locale: 'de',
            agentName: 'customer',
            modelId: 'test-model',
            finishReason: 'stop',
            usage: { totalTokens: 12 },
            failureCode: 'provider_error',
            startedAt,
            completedAt,
        });
        await testDb.insert(chatMessages).values([
            {
                chatMessageId: userMessageId,
                chatTurnId: firstTurnId,
                role: 'user',
                status: 'complete',
                revision: 1,
                body: {
                    id: userMessageId,
                    role: 'user',
                    parts: [{ type: 'text', text: 'find a cook', state: 'done' }],
                },
            },
            {
                chatMessageId: assistantMessageId,
                chatTurnId: firstTurnId,
                role: 'assistant',
                status: 'complete',
                revision: 3,
                body: {
                    id: assistantMessageId,
                    role: 'assistant',
                    parts: [
                        { type: 'stepStart' },
                        { type: 'text', text: 'looking', state: 'done' },
                        {
                            type: 'tool',
                            toolCallId,
                            toolName: 'searchCooks',
                            state: 'outputAvailable',
                            input: { q: 'berlin' },
                            output: { n: 1 },
                        },
                    ],
                },
            },
        ]);
        await testDb.insert(chatMessageUserAttachments).values([
            { chatMessageId: userMessageId, fileUploadId: laterFileId, position: 1 },
            { chatMessageId: userMessageId, fileUploadId: earlierFileId, position: 0 },
            { chatMessageId: assistantMessageId, fileUploadId: assistantFileId, position: 0 },
        ]);
        await testDb.insert(chatTurns).values({
            chatTurnId: secondTurnId,
            chatId,
            clientRequestId: idCreate(),
            status: 'complete',
            locale: 'en',
        });
        await testDb.insert(chatMessages).values([
            {
                chatMessageId: secondUserMessageId,
                chatTurnId: secondTurnId,
                role: 'user',
                status: 'complete',
                body: { id: secondUserMessageId, role: 'user', parts: [{ type: 'text', text: 'thanks', state: 'done' }] },
            },
            {
                chatMessageId: secondAssistantMessageId,
                chatTurnId: secondTurnId,
                role: 'assistant',
                status: 'complete',
                body: {
                    id: secondAssistantMessageId,
                    role: 'assistant',
                    parts: [{ type: 'text', text: 'welcome', state: 'done' }],
                },
            },
        ]);

        // Act
        const turns = await chatTurnsFindMany({ chatId }, requestingSession, serverRuntime);

        // Assert
        expect(turns.map((turn) => turn.chatTurnId)).toEqual([firstTurnId, secondTurnId]);
        expect(turns[0]!.sequence).toBeLessThan(turns[1]!.sequence);
        expect(turns[0]).toMatchObject({
            status: 'COMPLETE',
            revision: 2,
            locale: 'de',
            failure: { code: 'provider_error' },
            startedAt,
            completedAt,
            debug: includeDebug ? { agentName: 'customer', modelId: 'test-model', finishReason: 'stop', usage: { totalTokens: 12 } } : null,
        });
        expect(turns[0]!.userMessage).toMatchObject({
            chatMessageId: userMessageId,
            role: 'USER',
            status: 'COMPLETE',
            revision: 1,
            parts: [{ gqlTypeName: 'ChatMessageTextPart', partId: `${userMessageId}:0`, state: 'DONE', text: 'find a cook' }],
        });
        expect(turns[0]!.userMessage.attachments).toEqual([
            toGqlFileUpload({ fileUploadId: earlierFileId, filename: 'earlier.txt', mediaType: 'text/plain', size: 4 }),
            toGqlFileUpload({ fileUploadId: laterFileId, filename: 'later.txt', mediaType: 'text/plain', size: 4 }),
        ]);
        expect(turns[0]!.assistantMessage.attachments).toEqual([]);
        expect(turns[0]!.assistantMessage.parts).toEqual([
            { gqlTypeName: 'ChatMessageTextPart', partId: `${assistantMessageId}:1`, state: 'DONE', text: 'looking' },
            {
                gqlTypeName: 'ChatMessageToolPart',
                partId: `${assistantMessageId}:2`,
                toolCallId,
                toolName: 'searchCooks',
                title: null,
                state: 'OUTPUT_AVAILABLE',
                providerExecuted: false,
                preliminary: false,
                approval: null,
                debug: includeDebug ? { input: { q: 'berlin' }, output: { n: 1 }, errorText: null } : null,
            },
        ]);
        expect(turns[1]).toMatchObject({
            status: 'COMPLETE',
            locale: 'en',
            failure: null,
            debug: includeDebug ? { agentName: null, modelId: null, finishReason: null, usage: null } : null,
        });
    });

    it('omits a turn that is missing a user or assistant message', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        const chatId = await seedChat(user.userId);
        const completeTurnId = idCreate();
        const userOnlyTurnId = idCreate();
        const assistantOnlyTurnId = idCreate();
        const userMessageId = idCreate();
        const assistantMessageId = idCreate();
        const loneUserMessageId = idCreate();
        const loneAssistantMessageId = idCreate();

        await testDb.insert(chatTurns).values([
            { chatTurnId: userOnlyTurnId, chatId, clientRequestId: idCreate(), status: 'complete' },
            { chatTurnId: completeTurnId, chatId, clientRequestId: idCreate(), status: 'queued' },
            { chatTurnId: assistantOnlyTurnId, chatId, clientRequestId: idCreate(), status: 'failed' },
        ]);
        await testDb.insert(chatMessages).values([
            {
                chatMessageId: loneUserMessageId,
                chatTurnId: userOnlyTurnId,
                role: 'user',
                status: 'complete',
                body: { id: loneUserMessageId, role: 'user', parts: [{ type: 'text', text: 'only user', state: 'done' }] },
            },
            {
                chatMessageId: userMessageId,
                chatTurnId: completeTurnId,
                role: 'user',
                status: 'complete',
                body: { id: userMessageId, role: 'user', parts: [{ type: 'text', text: 'both', state: 'done' }] },
            },
            {
                chatMessageId: assistantMessageId,
                chatTurnId: completeTurnId,
                role: 'assistant',
                status: 'pending',
                body: { id: assistantMessageId, role: 'assistant', parts: [] },
            },
            {
                chatMessageId: loneAssistantMessageId,
                chatTurnId: assistantOnlyTurnId,
                role: 'assistant',
                status: 'failed',
                body: { id: loneAssistantMessageId, role: 'assistant', parts: [] },
            },
        ]);

        // Act
        const turns = await chatTurnsFindMany({ chatId }, requestingSession, serverRuntime);

        // Assert
        expect(turns.map((turn) => turn.chatTurnId)).toEqual([completeTurnId]);
        expect(turns[0]!.status).toBe('QUEUED');
        expect(turns[0]!.userMessage.parts).toEqual([
            { gqlTypeName: 'ChatMessageTextPart', partId: `${userMessageId}:0`, state: 'DONE', text: 'both' },
        ]);
    });

    it('returns an empty list for a foreign session', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        const chatId = await seedChat(owner.user.userId);
        const chatTurnId = idCreate();
        const userMessageId = idCreate();
        const assistantMessageId = idCreate();
        await testDb.insert(chatTurns).values({ chatTurnId, chatId, clientRequestId: idCreate(), status: 'complete' });
        await testDb.insert(chatMessages).values([
            {
                chatMessageId: userMessageId,
                chatTurnId,
                role: 'user',
                status: 'complete',
                body: { id: userMessageId, role: 'user', parts: [{ type: 'text', text: 'private', state: 'done' }] },
            },
            {
                chatMessageId: assistantMessageId,
                chatTurnId,
                role: 'assistant',
                status: 'complete',
                body: { id: assistantMessageId, role: 'assistant', parts: [] },
            },
        ]);

        // Act
        const turns = await chatTurnsFindMany({ chatId }, other.requestingSession, other.serverRuntime);

        // Assert
        expect(turns).toEqual([]);
    });

    it('returns an empty list when the session has no user', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const anonymous = await commandSetup();
        const chatId = await seedChat(owner.user.userId);
        const chatTurnId = idCreate();
        const userMessageId = idCreate();
        const assistantMessageId = idCreate();
        await testDb.insert(chatTurns).values({ chatTurnId, chatId, clientRequestId: idCreate(), status: 'complete' });
        await testDb.insert(chatMessages).values([
            {
                chatMessageId: userMessageId,
                chatTurnId,
                role: 'user',
                status: 'complete',
                body: { id: userMessageId, role: 'user', parts: [{ type: 'text', text: 'private', state: 'done' }] },
            },
            {
                chatMessageId: assistantMessageId,
                chatTurnId,
                role: 'assistant',
                status: 'complete',
                body: { id: assistantMessageId, role: 'assistant', parts: [] },
            },
        ]);

        // Act
        const turns = await chatTurnsFindMany({ chatId }, anonymous.requestingSession, anonymous.serverRuntime);

        // Assert
        expect(turns).toEqual([]);
    });

    it('returns turns for a foreign chat when the ownership check is skipped', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        const chatId = await seedChat(owner.user.userId);
        const chatTurnId = idCreate();
        const userMessageId = idCreate();
        const assistantMessageId = idCreate();
        await testDb.insert(chatTurns).values({
            chatTurnId,
            chatId,
            clientRequestId: idCreate(),
            status: 'complete',
            agentName: 'customer',
        });
        await testDb.insert(chatMessages).values([
            {
                chatMessageId: userMessageId,
                chatTurnId,
                role: 'user',
                status: 'complete',
                body: { id: userMessageId, role: 'user', parts: [{ type: 'text', text: 'shared', state: 'done' }] },
            },
            {
                chatMessageId: assistantMessageId,
                chatTurnId,
                role: 'assistant',
                status: 'complete',
                body: { id: assistantMessageId, role: 'assistant', parts: [] },
            },
        ]);

        // Act
        const turns = await chatTurnsFindMany({ chatId }, other.requestingSession, other.serverRuntime, { skipOwnershipCheck: true });

        // Assert
        expect(turns.map((turn) => turn.chatTurnId)).toEqual([chatTurnId]);
        expect(turns[0]!.userMessage.parts[0]).toMatchObject({ text: 'shared' });
        expect(turns[0]!.debug).toEqual(
            chatDebugEnabled() ? { agentName: 'customer', modelId: null, finishReason: null, usage: null } : null,
        );
    });

    it('returns an empty list for an admin who does not skip ownership on someone else chat', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const admin = await commandSetup.withUser();
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const chatId = await seedChat(owner.user.userId);
        const chatTurnId = idCreate();
        const userMessageId = idCreate();
        const assistantMessageId = idCreate();
        await testDb.insert(chatTurns).values({ chatTurnId, chatId, clientRequestId: idCreate(), status: 'complete' });
        await testDb.insert(chatMessages).values([
            {
                chatMessageId: userMessageId,
                chatTurnId,
                role: 'user',
                status: 'complete',
                body: { id: userMessageId, role: 'user', parts: [{ type: 'text', text: 'private', state: 'done' }] },
            },
            {
                chatMessageId: assistantMessageId,
                chatTurnId,
                role: 'assistant',
                status: 'complete',
                body: { id: assistantMessageId, role: 'assistant', parts: [] },
            },
        ]);

        // Act
        const turns = await chatTurnsFindMany({ chatId }, admin.requestingSession, admin.serverRuntime);

        // Assert
        expect(turns).toEqual([]);
    });

    it('includes debug for an admin inspecting a chat with ownership skipped', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const admin = await commandSetup.withUser();
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const chatId = await seedChat(owner.user.userId);
        const chatTurnId = idCreate();
        const userMessageId = idCreate();
        const assistantMessageId = idCreate();
        const toolCallId = idCreate();
        await testDb.insert(chatTurns).values({
            chatTurnId,
            chatId,
            clientRequestId: idCreate(),
            status: 'complete',
            agentName: 'admin',
            modelId: 'admin-model',
            finishReason: 'stop',
            usage: { totalTokens: 1 },
        });
        await testDb.insert(chatMessages).values([
            {
                chatMessageId: userMessageId,
                chatTurnId,
                role: 'user',
                status: 'complete',
                body: { id: userMessageId, role: 'user', parts: [{ type: 'text', text: 'inspect', state: 'done' }] },
            },
            {
                chatMessageId: assistantMessageId,
                chatTurnId,
                role: 'assistant',
                status: 'complete',
                body: {
                    id: assistantMessageId,
                    role: 'assistant',
                    parts: [
                        {
                            type: 'tool',
                            toolCallId,
                            toolName: 'searchCooks',
                            state: 'outputError',
                            errorText: 'nope',
                            input: { q: 'x' },
                        },
                    ],
                } satisfies ChatMessageBody,
            },
        ]);

        // Act
        const turns = await chatTurnsFindMany({ chatId }, admin.requestingSession, admin.serverRuntime, { skipOwnershipCheck: true });

        // Assert
        expect(turns).toHaveLength(1);
        expect(turns[0]!.debug).toEqual({ agentName: 'admin', modelId: 'admin-model', finishReason: 'stop', usage: { totalTokens: 1 } });
        expect(turns[0]!.assistantMessage.parts[0]).toMatchObject({
            gqlTypeName: 'ChatMessageToolPart',
            state: 'OUTPUT_ERROR',
            debug: { input: { q: 'x' }, output: null, errorText: 'nope' },
        });
    });

    it('logs and rethrows when a message body cannot be mapped', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        const chatId = await seedChat(user.userId);
        const chatTurnId = idCreate();
        const userMessageId = idCreate();
        const assistantMessageId = idCreate();
        await testDb.insert(chatTurns).values({ chatTurnId, chatId, clientRequestId: idCreate(), status: 'complete' });
        await testDb.insert(chatMessages).values([
            {
                chatMessageId: userMessageId,
                chatTurnId,
                role: 'user',
                status: 'complete',
                body: { id: userMessageId, role: 'user', parts: 'bad' } as unknown as ChatMessageBody,
            },
            {
                chatMessageId: assistantMessageId,
                chatTurnId,
                role: 'assistant',
                status: 'complete',
                body: { id: assistantMessageId, role: 'assistant', parts: [] },
            },
        ]);

        // Act / Assert
        await expect(chatTurnsFindMany({ chatId }, requestingSession, serverRuntime)).rejects.toThrow(/is not a function/);

        const [turn] = await testDb
            .select({ chatTurnId: chatTurns.chatTurnId })
            .from(chatTurns)
            .where(eq(chatTurns.chatTurnId, chatTurnId));
        expect(turn).toEqual({ chatTurnId });
        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(logRows.some((row) => row.level === 'error' && /is not a function/.test(row.message))).toBe(true);
    });
});
