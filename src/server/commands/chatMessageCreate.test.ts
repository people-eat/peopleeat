import { asc, eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { chatMessages, chatMessageUserAttachments, chats, chatTurns, fileUploads } from '../db/schema';
import type { ChatMessagePart } from '../domain/chatMessageBody';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { chatTurnRunDetached } from '../lib/chatTurnRunDetached';
import { commandSetup, testDb, userMutationParent } from '../test/commandTestUtils';
import { chatMessageCreate } from './chatMessageCreate';

vi.mock('../lib/chatTurnRunDetached', () => ({
    chatTurnRunDetached: vi.fn(),
}));

const assistantOptions = { requireToolCallApprovals: false };

function expectNoFanout(serverRuntime: ServerRuntime) {
    expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    expect(serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
    expect(serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
}

function expectRunnerNotStarted(serverRuntime: ServerRuntime) {
    expect(serverRuntime.publish.chatTurnUpdates).not.toHaveBeenCalled();
    expect(vi.mocked(chatTurnRunDetached)).not.toHaveBeenCalled();
    expectNoFanout(serverRuntime);
}

function errorText(error: unknown): string {
    if (!(error instanceof Error)) return String(error);
    const cause = error.cause;
    const causeText = cause instanceof Error ? cause.message : cause == null ? '' : String(cause);
    return `${error.message}\n${causeText}`;
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

async function seedChat(
    userId: string,
    overrides: {
        surface?: 'admin' | 'cook' | 'customer' | null;
        title?: string;
        deletedAt?: Date | null;
        lastModifiedAt?: Date;
    } = {},
) {
    const chatId = idCreate();
    await testDb.insert(chats).values({
        chatId,
        userId,
        surface: overrides.surface === undefined ? 'customer' : overrides.surface,
        title: overrides.title ?? '',
        ...(overrides.deletedAt ? { deletedAt: overrides.deletedAt } : {}),
        ...(overrides.lastModifiedAt ? { lastModifiedAt: overrides.lastModifiedAt } : {}),
    });
    return chatId;
}

async function seedTurn(input: {
    chatId: string;
    status?: 'awaitingInput' | 'complete' | 'queued' | 'running';
    clientRequestId?: string;
    revision?: number;
    assistantParts?: ChatMessagePart[];
    includeUser?: boolean;
    includeAssistant?: boolean;
}) {
    const chatTurnId = idCreate();
    const clientRequestId = input.clientRequestId ?? idCreate();
    const userMessageId = idCreate();
    const assistantMessageId = idCreate();
    const status = input.status ?? 'complete';
    const revision = input.revision ?? 0;
    await testDb.insert(chatTurns).values({
        chatTurnId,
        chatId: input.chatId,
        clientRequestId,
        status,
        revision,
        ...(status === 'complete' ? { completedAt: new Date(), finishReason: 'stop' } : {}),
    });
    if (input.includeUser !== false) {
        await testDb.insert(chatMessages).values({
            chatMessageId: userMessageId,
            chatTurnId,
            role: 'user',
            status: 'complete',
            revision,
            body: {
                id: userMessageId,
                role: 'user',
                parts: [{ type: 'text', text: 'earlier', state: 'done' }],
            },
        });
    }
    if (input.includeAssistant !== false) {
        await testDb.insert(chatMessages).values({
            chatMessageId: assistantMessageId,
            chatTurnId,
            role: 'assistant',
            status: status === 'awaitingInput' ? 'streaming' : 'complete',
            revision,
            body: {
                id: assistantMessageId,
                role: 'assistant',
                parts: input.assistantParts ?? [{ type: 'text', text: 'reply', state: 'done' }],
            },
        });
    }
    return { chatTurnId, clientRequestId, userMessageId, assistantMessageId };
}

describe('chatMessageCreate', () => {
    it('creates a new chat, persists the turn, publishes, and starts the runner', async () => {
        // Arrange
        const setup = await commandSetup.withUser();
        const clientRequestId = idCreate();

        // Act
        const result = await chatMessageCreate(
            userMutationParent(setup.user.userId),
            {
                message: '  hello chef  ',
                clientRequestId,
                surface: 'admin',
                assistantOptions,
            },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        const [chat] = await testDb.select().from(chats).where(eq(chats.chatId, result!.chatId));
        const [turn] = await testDb.select().from(chatTurns).where(eq(chatTurns.clientRequestId, clientRequestId));
        const messages = await testDb.select().from(chatMessages).where(eq(chatMessages.chatTurnId, turn!.chatTurnId));
        const userMessage = messages.find((message) => message.role === 'user');
        const assistantMessage = messages.find((message) => message.role === 'assistant');
        const attachments = await testDb
            .select()
            .from(chatMessageUserAttachments)
            .where(eq(chatMessageUserAttachments.chatMessageId, userMessage!.chatMessageId));

        expect(result).toEqual({ chatId: chat!.chatId, chatTurnId: turn!.chatTurnId });
        expect(chat).toMatchObject({ userId: setup.user.userId, surface: 'admin', title: '', deletedAt: null });
        expect(turn).toMatchObject({ chatId: chat!.chatId, status: 'queued', revision: 0, clientRequestId });
        expect(userMessage).toMatchObject({ status: 'complete', revision: 0 });
        expect(userMessage!.body).toMatchObject({
            id: userMessage!.chatMessageId,
            role: 'user',
            parts: [{ type: 'text', text: 'hello chef', state: 'done' }],
        });
        expect(assistantMessage).toMatchObject({ status: 'pending', revision: 0 });
        expect(assistantMessage!.body).toMatchObject({ id: assistantMessage!.chatMessageId, role: 'assistant', parts: [] });
        expect(attachments).toEqual([]);
        expect(setup.serverRuntime.publish.chatTurnUpdates).toHaveBeenCalledTimes(1);
        expect(setup.serverRuntime.publish.chatTurnUpdates).toHaveBeenCalledWith({
            chatId: chat!.chatId,
            chatTurnId: turn!.chatTurnId,
            revision: turn!.revision,
        });
        expect(vi.mocked(chatTurnRunDetached)).toHaveBeenCalledTimes(1);
        expect(vi.mocked(chatTurnRunDetached)).toHaveBeenCalledWith({
            chatTurnId: turn!.chatTurnId,
            surface: 'admin',
            assistantOptions,
            requestingSession: setup.requestingSession,
            serverRuntime: setup.serverRuntime,
        });
        expectNoFanout(setup.serverRuntime);
    });

    it('stores owned attachments in request order and drops duplicate ids', async () => {
        // Arrange
        const setup = await commandSetup.withUser();
        const firstId = await insertFileUpload(setup.user.userId, 'first.txt');
        const secondId = await insertFileUpload(setup.user.userId, 'second.txt');
        const clientRequestId = idCreate();

        // Act
        const result = await chatMessageCreate(
            userMutationParent(setup.user.userId),
            {
                message: 'see files',
                clientRequestId,
                surface: 'customer',
                fileUploadIds: [secondId, firstId, secondId],
                assistantOptions,
            },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        const [turn] = await testDb.select().from(chatTurns).where(eq(chatTurns.clientRequestId, clientRequestId));
        const messages = await testDb.select().from(chatMessages).where(eq(chatMessages.chatTurnId, turn!.chatTurnId));
        const userMessage = messages.find((message) => message.role === 'user');
        const attachments = await testDb
            .select()
            .from(chatMessageUserAttachments)
            .where(eq(chatMessageUserAttachments.chatMessageId, userMessage!.chatMessageId))
            .orderBy(asc(chatMessageUserAttachments.position));

        expect(result).toEqual({ chatId: turn!.chatId, chatTurnId: turn!.chatTurnId });
        expect(attachments).toEqual([
            { chatMessageId: userMessage!.chatMessageId, fileUploadId: secondId, position: 0 },
            { chatMessageId: userMessage!.chatMessageId, fileUploadId: firstId, position: 1 },
        ]);
        expect(vi.mocked(chatTurnRunDetached)).toHaveBeenCalledWith({
            chatTurnId: turn!.chatTurnId,
            surface: 'customer',
            assistantOptions,
            requestingSession: setup.requestingSession,
            serverRuntime: setup.serverRuntime,
        });
        expectNoFanout(setup.serverRuntime);
    });

    it('appends a turn to an existing chat and resumes on the stored surface', async () => {
        // Arrange
        const setup = await commandSetup.withUser();
        const lastModifiedAt = new Date('2020-01-01T00:00:00.000Z');
        const chatId = await seedChat(setup.user.userId, { surface: 'cook', title: 'Kept', lastModifiedAt });
        const previous = await seedTurn({ chatId, status: 'complete' });
        const clientRequestId = idCreate();

        // Act
        const result = await chatMessageCreate(
            userMutationParent(setup.user.userId),
            {
                chatId,
                message: 'next question',
                clientRequestId,
                surface: 'customer',
                fileUploadIds: null,
                assistantOptions,
            },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        const [chat] = await testDb.select().from(chats).where(eq(chats.chatId, chatId));
        const [previousTurn] = await testDb.select().from(chatTurns).where(eq(chatTurns.chatTurnId, previous.chatTurnId));
        const [turn] = await testDb.select().from(chatTurns).where(eq(chatTurns.clientRequestId, clientRequestId));
        const messages = await testDb.select().from(chatMessages).where(eq(chatMessages.chatTurnId, turn!.chatTurnId));
        const userMessage = messages.find((message) => message.role === 'user');

        expect(result).toEqual({ chatId, chatTurnId: turn!.chatTurnId });
        expect(chat).toMatchObject({ title: 'Kept', surface: 'cook' });
        expect(chat!.lastModifiedAt.getTime()).toBeGreaterThan(lastModifiedAt.getTime());
        expect(previousTurn).toMatchObject({ status: 'complete', finishReason: 'stop' });
        expect(userMessage!.body.parts).toEqual([{ type: 'text', text: 'next question', state: 'done' }]);
        expect(setup.serverRuntime.publish.chatTurnUpdates).toHaveBeenCalledWith({
            chatId,
            chatTurnId: turn!.chatTurnId,
            revision: turn!.revision,
        });
        expect(vi.mocked(chatTurnRunDetached)).toHaveBeenCalledWith({
            chatTurnId: turn!.chatTurnId,
            surface: 'cook',
            assistantOptions,
            requestingSession: setup.requestingSession,
            serverRuntime: setup.serverRuntime,
        });
        expectNoFanout(setup.serverRuntime);
    });

    it('closes an open prompt and pivots the awaiting turn before starting a new one', async () => {
        // Arrange
        const setup = await commandSetup.withUser();
        const chatId = await seedChat(setup.user.userId, { surface: 'cook', title: 'Kept' });
        const openToolCallId = idCreate();
        const answeredToolCallId = idCreate();
        const otherToolCallId = idCreate();
        const assistantParts: ChatMessagePart[] = [
            { type: 'text', text: 'Need a few details', state: 'done' },
            {
                type: 'tool',
                toolCallId: openToolCallId,
                toolName: 'promptUserForInput',
                state: 'inputAvailable',
                input: { fields: ['guests'] },
            },
            {
                type: 'tool',
                toolCallId: answeredToolCallId,
                toolName: 'promptUserForInput',
                state: 'outputAvailable',
                output: { skipped: false, answers: ['kept'] },
            },
            {
                type: 'tool',
                toolCallId: otherToolCallId,
                toolName: 'searchCooks',
                state: 'inputAvailable',
                input: { q: 'berlin' },
            },
        ];
        const awaiting = await seedTurn({ chatId, status: 'awaitingInput', assistantParts });
        const clientRequestId = idCreate();

        // Act
        const result = await chatMessageCreate(
            userMutationParent(setup.user.userId),
            {
                chatId,
                message: 'skip the form',
                clientRequestId,
                surface: 'customer',
                assistantOptions,
            },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        const [closedTurn] = await testDb.select().from(chatTurns).where(eq(chatTurns.chatTurnId, awaiting.chatTurnId));
        const [closedAssistant] = await testDb
            .select()
            .from(chatMessages)
            .where(eq(chatMessages.chatMessageId, awaiting.assistantMessageId));
        const [turn] = await testDb.select().from(chatTurns).where(eq(chatTurns.clientRequestId, clientRequestId));
        const messages = await testDb.select().from(chatMessages).where(eq(chatMessages.chatTurnId, turn!.chatTurnId));
        const userMessage = messages.find((message) => message.role === 'user');

        expect(result).toEqual({ chatId, chatTurnId: turn!.chatTurnId });
        expect(closedTurn).toMatchObject({ status: 'complete', finishReason: 'pivot' });
        expect(closedTurn!.completedAt).toBeInstanceOf(Date);
        expect(closedAssistant).toMatchObject({ status: 'complete' });
        expect(closedAssistant!.body.parts).toEqual([
            { type: 'text', text: 'Need a few details', state: 'done' },
            {
                type: 'tool',
                toolCallId: openToolCallId,
                toolName: 'promptUserForInput',
                state: 'outputAvailable',
                input: { fields: ['guests'] },
                output: { skipped: true, answers: [] },
            },
            {
                type: 'tool',
                toolCallId: answeredToolCallId,
                toolName: 'promptUserForInput',
                state: 'outputAvailable',
                output: { skipped: false, answers: ['kept'] },
            },
            {
                type: 'tool',
                toolCallId: otherToolCallId,
                toolName: 'searchCooks',
                state: 'inputAvailable',
                input: { q: 'berlin' },
            },
        ]);
        expect(userMessage!.body.parts).toEqual([{ type: 'text', text: 'skip the form', state: 'done' }]);
        expect(setup.serverRuntime.publish.chatTurnUpdates).toHaveBeenCalledTimes(1);
        expect(setup.serverRuntime.publish.chatTurnUpdates).toHaveBeenCalledWith({
            chatId,
            chatTurnId: turn!.chatTurnId,
            revision: turn!.revision,
        });
        expect(vi.mocked(chatTurnRunDetached)).toHaveBeenCalledTimes(1);
        expect(vi.mocked(chatTurnRunDetached)).toHaveBeenCalledWith({
            chatTurnId: turn!.chatTurnId,
            surface: 'cook',
            assistantOptions,
            requestingSession: setup.requestingSession,
            serverRuntime: setup.serverRuntime,
        });
        expectNoFanout(setup.serverRuntime);
    });

    it('returns the existing turn without starting the runner when the client request id was already used', async () => {
        // Arrange
        const setup = await commandSetup.withUser();
        const chatId = await seedChat(setup.user.userId, { title: 'Original' });
        const existing = await seedTurn({ chatId, status: 'complete', revision: 4 });
        const chatsBefore = await testDb.select().from(chats).where(eq(chats.userId, setup.user.userId));

        // Act
        const result = await chatMessageCreate(
            userMutationParent(setup.user.userId),
            {
                chatId: idCreate(),
                message: 'again',
                clientRequestId: existing.clientRequestId,
                surface: 'customer',
                assistantOptions,
            },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        const turns = await testDb.select().from(chatTurns).where(eq(chatTurns.chatId, chatId));
        const chatsAfter = await testDb.select().from(chats).where(eq(chats.userId, setup.user.userId));
        expect(result).toEqual({ chatId, chatTurnId: existing.chatTurnId });
        expect(turns).toHaveLength(1);
        expect(chatsAfter).toHaveLength(chatsBefore.length);
        expect(setup.serverRuntime.publish.chatTurnUpdates).toHaveBeenCalledTimes(1);
        expect(setup.serverRuntime.publish.chatTurnUpdates).toHaveBeenCalledWith({
            chatId,
            chatTurnId: existing.chatTurnId,
            revision: 4,
        });
        expect(vi.mocked(chatTurnRunDetached)).not.toHaveBeenCalled();
        expectNoFanout(setup.serverRuntime);
    });

    it('rejects an empty message before writing or publishing', async () => {
        // Arrange
        const setup = await commandSetup.withUser();

        // Act / Assert
        await expect(
            chatMessageCreate(
                userMutationParent(setup.user.userId),
                { message: '', clientRequestId: idCreate(), surface: 'customer', assistantOptions },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow('Chat message must not be empty');

        const owned = await testDb.select().from(chats).where(eq(chats.userId, setup.user.userId));
        expect(owned).toEqual([]);
        expectRunnerNotStarted(setup.serverRuntime);
    });

    it('rejects a whitespace-only message before writing or publishing', async () => {
        // Arrange
        const setup = await commandSetup.withUser();

        // Act / Assert
        await expect(
            chatMessageCreate(
                userMutationParent(setup.user.userId),
                { message: ' \n\t ', clientRequestId: idCreate(), surface: 'customer', assistantOptions },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow('Chat message must not be empty');

        const owned = await testDb.select().from(chats).where(eq(chats.userId, setup.user.userId));
        expect(owned).toEqual([]);
        expectRunnerNotStarted(setup.serverRuntime);
    });

    it('rejects an unknown user before writing or publishing', async () => {
        // Arrange
        const setup = await commandSetup();
        const missingUserId = idCreate();

        // Act / Assert
        await expect(
            chatMessageCreate(
                userMutationParent(missingUserId),
                { message: 'hello', clientRequestId: idCreate(), surface: 'customer', assistantOptions },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow('Unauthorized');

        const owned = await testDb.select().from(chats).where(eq(chats.userId, missingUserId));
        expect(owned).toEqual([]);
        expectRunnerNotStarted(setup.serverRuntime);
    });

    it('rejects a file upload the user does not own', async () => {
        // Arrange
        const setup = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        const foreignId = await insertFileUpload(other.user.userId, 'secret.txt');
        const missingId = idCreate();

        // Act / Assert
        await expect(
            chatMessageCreate(
                userMutationParent(setup.user.userId),
                {
                    message: 'attach',
                    clientRequestId: idCreate(),
                    surface: 'customer',
                    fileUploadIds: [foreignId],
                    assistantOptions,
                },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow(`File upload not found or not owned: ${foreignId}`);

        await expect(
            chatMessageCreate(
                userMutationParent(setup.user.userId),
                {
                    message: 'attach',
                    clientRequestId: idCreate(),
                    surface: 'customer',
                    fileUploadIds: [missingId],
                    assistantOptions,
                },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow(`File upload not found or not owned: ${missingId}`);

        const owned = await testDb.select().from(chats).where(eq(chats.userId, setup.user.userId));
        expect(owned).toEqual([]);
        expectRunnerNotStarted(setup.serverRuntime);
    });

    it('rejects a missing chat', async () => {
        // Arrange
        const setup = await commandSetup.withUser();
        const chatId = idCreate();

        // Act / Assert
        await expect(
            chatMessageCreate(
                userMutationParent(setup.user.userId),
                { chatId, message: 'hello', clientRequestId: idCreate(), surface: 'customer', assistantOptions },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow(`Chat not found: ${chatId}`);

        const turns = await testDb.select().from(chatTurns).where(eq(chatTurns.chatId, chatId));
        expect(turns).toEqual([]);
        expectRunnerNotStarted(setup.serverRuntime);
    });

    it('rejects a soft-deleted chat', async () => {
        // Arrange
        const setup = await commandSetup.withUser();
        const deletedAt = new Date('2024-05-01T00:00:00.000Z');
        const chatId = await seedChat(setup.user.userId, { deletedAt, title: 'Gone' });

        // Act / Assert
        await expect(
            chatMessageCreate(
                userMutationParent(setup.user.userId),
                { chatId, message: 'hello', clientRequestId: idCreate(), surface: 'customer', assistantOptions },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow(`Chat not found: ${chatId}`);

        const [chat] = await testDb.select().from(chats).where(eq(chats.chatId, chatId));
        const turns = await testDb.select().from(chatTurns).where(eq(chatTurns.chatId, chatId));
        expect(chat!.deletedAt).toEqual(deletedAt);
        expect(chat!.title).toBe('Gone');
        expect(turns).toEqual([]);
        expectRunnerNotStarted(setup.serverRuntime);
    });

    it('rejects a chat owned by someone else', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        const lastModifiedAt = new Date('2021-02-02T00:00:00.000Z');
        const chatId = await seedChat(owner.user.userId, { title: 'Mine', lastModifiedAt });

        // Act / Assert
        await expect(
            chatMessageCreate(
                userMutationParent(other.user.userId),
                { chatId, message: 'hello', clientRequestId: idCreate(), surface: 'customer', assistantOptions },
                other.requestingSession,
                other.serverRuntime,
            ),
        ).rejects.toThrow(`Chat not found: ${chatId}`);

        const [chat] = await testDb.select().from(chats).where(eq(chats.chatId, chatId));
        const turns = await testDb.select().from(chatTurns).where(eq(chatTurns.chatId, chatId));
        expect(chat).toMatchObject({ userId: owner.user.userId, title: 'Mine', lastModifiedAt });
        expect(turns).toEqual([]);
        expectRunnerNotStarted(other.serverRuntime);
    });

    it('rejects a chat with no surface', async () => {
        // Arrange
        const setup = await commandSetup.withUser();
        const chatId = await seedChat(setup.user.userId, { surface: null, title: 'No rail' });

        // Act / Assert
        await expect(
            chatMessageCreate(
                userMutationParent(setup.user.userId),
                { chatId, message: 'hello', clientRequestId: idCreate(), surface: 'customer', assistantOptions },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow(`Chat ${chatId} has no surface`);

        const [chat] = await testDb.select().from(chats).where(eq(chats.chatId, chatId));
        const turns = await testDb.select().from(chatTurns).where(eq(chatTurns.chatId, chatId));
        expect(chat!.surface).toBeNull();
        expect(turns).toEqual([]);
        expectRunnerNotStarted(setup.serverRuntime);
    });

    it('rethrows when the chat already has an active turn', async () => {
        // Arrange
        const setup = await commandSetup.withUser();
        const chatId = await seedChat(setup.user.userId);
        const active = await seedTurn({ chatId, status: 'queued' });
        const clientRequestId = idCreate();

        // Act
        let thrown: unknown;
        try {
            await chatMessageCreate(
                userMutationParent(setup.user.userId),
                { chatId, message: 'another', clientRequestId, surface: 'customer', assistantOptions },
                setup.requestingSession,
                setup.serverRuntime,
            );
        } catch (error) {
            thrown = error;
        }

        // Assert
        const turns = await testDb.select().from(chatTurns).where(eq(chatTurns.chatId, chatId));
        expect(errorText(thrown)).toContain('ChatTurns_chatId_active_unique');
        expect(turns).toHaveLength(1);
        expect(turns[0]).toMatchObject({ chatTurnId: active.chatTurnId, status: 'queued' });
        expectRunnerNotStarted(setup.serverRuntime);
    });

    it('rethrows when the awaiting turn has no assistant message to close', async () => {
        // Arrange
        const setup = await commandSetup.withUser();
        const chatId = await seedChat(setup.user.userId);
        const awaiting = await seedTurn({ chatId, status: 'awaitingInput', includeAssistant: false });

        // Act
        let thrown: unknown;
        try {
            await chatMessageCreate(
                userMutationParent(setup.user.userId),
                { chatId, message: 'pivot', clientRequestId: idCreate(), surface: 'customer', assistantOptions },
                setup.requestingSession,
                setup.serverRuntime,
            );
        } catch (error) {
            thrown = error;
        }

        // Assert
        const turns = await testDb.select().from(chatTurns).where(eq(chatTurns.chatId, chatId));
        expect(errorText(thrown)).toContain('ChatTurns_chatId_active_unique');
        expect(turns).toEqual([expect.objectContaining({ chatTurnId: awaiting.chatTurnId, status: 'awaitingInput' })]);
        expectRunnerNotStarted(setup.serverRuntime);
    });

    it('rethrows when the client request id belongs to another user', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        const chatId = await seedChat(owner.user.userId);
        const existing = await seedTurn({ chatId, status: 'complete' });

        // Act
        let thrown: unknown;
        try {
            await chatMessageCreate(
                userMutationParent(other.user.userId),
                {
                    message: 'collide',
                    clientRequestId: existing.clientRequestId,
                    surface: 'customer',
                    assistantOptions,
                },
                other.requestingSession,
                other.serverRuntime,
            );
        } catch (error) {
            thrown = error;
        }

        // Assert
        const [kept] = await testDb.select().from(chatTurns).where(eq(chatTurns.chatTurnId, existing.chatTurnId));
        const otherChats = await testDb.select().from(chats).where(eq(chats.userId, other.user.userId));
        expect(errorText(thrown)).toContain('ChatTurns_clientRequestId_unique');
        expect(kept).toMatchObject({ status: 'complete', clientRequestId: existing.clientRequestId });
        expect(otherChats).toEqual([]);
        expectRunnerNotStarted(other.serverRuntime);
    });
});
