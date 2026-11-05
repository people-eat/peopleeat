import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { chatMessages, chats, chatTurns } from '../db/schema';
import type { ChatMessagePart } from '../domain/chatMessageBody';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { chatTurnRunDetached } from '../lib/chatTurnRunDetached';
import { commandSetup, testDb, userMutationParent } from '../test/commandTestUtils';
import { chatInputCollectionRespond } from './chatInputCollectionRespond';

vi.mock('../lib/chatTurnRunDetached', () => ({
    chatTurnRunDetached: vi.fn(),
}));

const assistantOptions = { requireToolCallApprovals: false };
const answers = { guests: 8, note: 'no nuts' };

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

async function seedChat(userId: string, overrides: { surface?: 'admin' | 'cook' | 'customer' | null; lastModifiedAt?: Date } = {}) {
    const chatId = idCreate();
    await testDb.insert(chats).values({
        chatId,
        userId,
        surface: overrides.surface === undefined ? 'customer' : overrides.surface,
        title: 'Questions',
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

describe('chatInputCollectionRespond', () => {
    it('writes the tool result, publishes the turn, and resumes the runner', async () => {
        // Arrange
        const setup = await commandSetup.withUser();
        const lastModifiedAt = new Date('2020-01-01T00:00:00.000Z');
        const chatId = await seedChat(setup.user.userId, { surface: 'admin', lastModifiedAt });
        const toolCallId = idCreate();
        const otherToolCallId = idCreate();
        const parts: ChatMessagePart[] = [
            { type: 'text', text: 'A few questions', state: 'done' },
            {
                type: 'tool',
                toolCallId,
                toolName: 'promptUserForInput',
                state: 'inputAvailable',
                input: { fields: ['guests'] },
            },
            {
                type: 'tool',
                toolCallId: otherToolCallId,
                toolName: 'promptUserForInput',
                state: 'inputAvailable',
                input: { fields: ['date'] },
            },
        ];
        const awaiting = await seedTurn({ chatId, status: 'awaitingInput', revision: 4, assistantParts: parts });
        const clientRequestId = idCreate();

        // Act
        const result = await chatInputCollectionRespond(
            userMutationParent(setup.user.userId),
            { chatTurnId: awaiting.chatTurnId, toolCallId, answers, clientRequestId, assistantOptions },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        const [chat] = await testDb.select().from(chats).where(eq(chats.chatId, chatId));
        const [turn] = await testDb.select().from(chatTurns).where(eq(chatTurns.chatTurnId, awaiting.chatTurnId));
        const [assistant] = await testDb.select().from(chatMessages).where(eq(chatMessages.chatMessageId, awaiting.assistantMessageId));
        const body = assistant!.body;

        expect(result).toEqual({ chatId, chatTurnId: awaiting.chatTurnId });
        expect(chat!.lastModifiedAt.getTime()).toBeGreaterThan(lastModifiedAt.getTime());
        expect(turn).toMatchObject({ status: 'queued', clientRequestId, revision: 5 });
        expect(assistant).toMatchObject({ status: 'streaming', revision: 5 });
        expect(body.parts).toEqual([
            parts[0],
            {
                type: 'tool',
                toolCallId,
                toolName: 'promptUserForInput',
                state: 'outputAvailable',
                input: { fields: ['guests'] },
                output: answers,
            },
            parts[2],
        ]);
        expect(setup.serverRuntime.publish.chatTurnUpdates).toHaveBeenCalledTimes(1);
        expect(setup.serverRuntime.publish.chatTurnUpdates).toHaveBeenCalledWith({
            chatId,
            chatTurnId: awaiting.chatTurnId,
            revision: 5,
        });
        expect(vi.mocked(chatTurnRunDetached)).toHaveBeenCalledTimes(1);
        expect(vi.mocked(chatTurnRunDetached)).toHaveBeenCalledWith({
            chatTurnId: awaiting.chatTurnId,
            surface: 'admin',
            assistantOptions,
            requestingSession: setup.requestingSession,
            serverRuntime: setup.serverRuntime,
        });
        expectNoFanout(setup.serverRuntime);
    });

    it('returns the existing turn without resuming when the client request id was already used', async () => {
        // Arrange
        const setup = await commandSetup.withUser();
        const chatId = await seedChat(setup.user.userId);
        const existing = await seedTurn({ chatId, status: 'complete', revision: 6 });
        const toolCallId = idCreate();
        const awaiting = await seedTurn({
            chatId,
            status: 'awaitingInput',
            revision: 1,
            assistantParts: [
                { type: 'tool', toolCallId, toolName: 'promptUserForInput', state: 'inputAvailable', input: { fields: ['guests'] } },
            ],
        });
        const [before] = await testDb.select().from(chatMessages).where(eq(chatMessages.chatMessageId, awaiting.assistantMessageId));

        // Act
        const result = await chatInputCollectionRespond(
            userMutationParent(setup.user.userId),
            { chatTurnId: awaiting.chatTurnId, toolCallId, answers, clientRequestId: existing.clientRequestId, assistantOptions },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        const [awaitingTurn] = await testDb.select().from(chatTurns).where(eq(chatTurns.chatTurnId, awaiting.chatTurnId));
        const [assistant] = await testDb.select().from(chatMessages).where(eq(chatMessages.chatMessageId, awaiting.assistantMessageId));
        expect(result).toEqual({ chatId, chatTurnId: existing.chatTurnId });
        expect(awaitingTurn).toMatchObject({ status: 'awaitingInput', clientRequestId: awaiting.clientRequestId, revision: 1 });
        expect(assistant!.body).toEqual(before!.body);
        expect(setup.serverRuntime.publish.chatTurnUpdates).toHaveBeenCalledTimes(1);
        expect(setup.serverRuntime.publish.chatTurnUpdates).toHaveBeenCalledWith({
            chatId,
            chatTurnId: existing.chatTurnId,
            revision: 6,
        });
        expect(vi.mocked(chatTurnRunDetached)).not.toHaveBeenCalled();
        expectNoFanout(setup.serverRuntime);
    });

    it('rejects an unknown user before writing or publishing', async () => {
        // Arrange
        const setup = await commandSetup();

        // Act / Assert
        await expect(
            chatInputCollectionRespond(
                userMutationParent(idCreate()),
                { chatTurnId: idCreate(), toolCallId: idCreate(), answers, clientRequestId: idCreate(), assistantOptions },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow('Unauthorized');

        expectRunnerNotStarted(setup.serverRuntime);
    });

    it('rejects a missing turn', async () => {
        // Arrange
        const setup = await commandSetup.withUser();
        const chatTurnId = idCreate();

        // Act / Assert
        await expect(
            chatInputCollectionRespond(
                userMutationParent(setup.user.userId),
                { chatTurnId, toolCallId: idCreate(), answers, clientRequestId: idCreate(), assistantOptions },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow(`No awaiting turn for input respond: ${chatTurnId}`);

        expectRunnerNotStarted(setup.serverRuntime);
    });

    it('rejects a turn owned by someone else', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        const chatId = await seedChat(owner.user.userId);
        const toolCallId = idCreate();
        const awaiting = await seedTurn({
            chatId,
            status: 'awaitingInput',
            revision: 2,
            assistantParts: [{ type: 'tool', toolCallId, toolName: 'promptUserForInput', state: 'inputAvailable' }],
        });

        // Act / Assert
        await expect(
            chatInputCollectionRespond(
                userMutationParent(other.user.userId),
                { chatTurnId: awaiting.chatTurnId, toolCallId, answers, clientRequestId: idCreate(), assistantOptions },
                other.requestingSession,
                other.serverRuntime,
            ),
        ).rejects.toThrow(`No awaiting turn for input respond: ${awaiting.chatTurnId}`);

        const [turn] = await testDb.select().from(chatTurns).where(eq(chatTurns.chatTurnId, awaiting.chatTurnId));
        expect(turn).toMatchObject({ status: 'awaitingInput', revision: 2, clientRequestId: awaiting.clientRequestId });
        expectRunnerNotStarted(other.serverRuntime);
    });

    it('rejects a turn that is not awaiting input', async () => {
        // Arrange
        const setup = await commandSetup.withUser();
        const chatId = await seedChat(setup.user.userId);
        const toolCallId = idCreate();
        const running = await seedTurn({
            chatId,
            status: 'running',
            revision: 3,
            assistantParts: [{ type: 'tool', toolCallId, toolName: 'promptUserForInput', state: 'inputAvailable' }],
        });

        // Act / Assert
        await expect(
            chatInputCollectionRespond(
                userMutationParent(setup.user.userId),
                { chatTurnId: running.chatTurnId, toolCallId, answers, clientRequestId: idCreate(), assistantOptions },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow(`No awaiting turn for input respond: ${running.chatTurnId}`);

        const [turn] = await testDb.select().from(chatTurns).where(eq(chatTurns.chatTurnId, running.chatTurnId));
        expect(turn).toMatchObject({ status: 'running', revision: 3 });
        expectRunnerNotStarted(setup.serverRuntime);
    });

    it('rejects an awaiting turn that has no assistant message', async () => {
        // Arrange
        const setup = await commandSetup.withUser();
        const chatId = await seedChat(setup.user.userId);
        const awaiting = await seedTurn({ chatId, status: 'awaitingInput', includeAssistant: false });

        // Act / Assert
        await expect(
            chatInputCollectionRespond(
                userMutationParent(setup.user.userId),
                { chatTurnId: awaiting.chatTurnId, toolCallId: idCreate(), answers, clientRequestId: idCreate(), assistantOptions },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow(`No awaiting turn for input respond: ${awaiting.chatTurnId}`);

        const [turn] = await testDb.select().from(chatTurns).where(eq(chatTurns.chatTurnId, awaiting.chatTurnId));
        expect(turn).toMatchObject({ status: 'awaitingInput', clientRequestId: awaiting.clientRequestId });
        expectRunnerNotStarted(setup.serverRuntime);
    });

    it('rejects a chat with no surface', async () => {
        // Arrange
        const setup = await commandSetup.withUser();
        const chatId = await seedChat(setup.user.userId, { surface: null });
        const toolCallId = idCreate();
        const awaiting = await seedTurn({
            chatId,
            status: 'awaitingInput',
            assistantParts: [{ type: 'tool', toolCallId, toolName: 'promptUserForInput', state: 'inputAvailable' }],
        });

        // Act / Assert
        await expect(
            chatInputCollectionRespond(
                userMutationParent(setup.user.userId),
                { chatTurnId: awaiting.chatTurnId, toolCallId, answers, clientRequestId: idCreate(), assistantOptions },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow(`Chat ${chatId} has no surface`);

        const [turn] = await testDb.select().from(chatTurns).where(eq(chatTurns.chatTurnId, awaiting.chatTurnId));
        const [assistant] = await testDb.select().from(chatMessages).where(eq(chatMessages.chatMessageId, awaiting.assistantMessageId));
        expect(turn).toMatchObject({ status: 'awaitingInput' });
        expect(assistant!.body.parts[0]).toMatchObject({ state: 'inputAvailable' });
        expectRunnerNotStarted(setup.serverRuntime);
    });

    it('rejects an unknown tool call id', async () => {
        // Arrange
        const setup = await commandSetup.withUser();
        const chatId = await seedChat(setup.user.userId);
        const awaiting = await seedTurn({
            chatId,
            status: 'awaitingInput',
            revision: 1,
            assistantParts: [{ type: 'tool', toolCallId: idCreate(), toolName: 'promptUserForInput', state: 'inputAvailable' }],
        });
        const toolCallId = idCreate();

        // Act / Assert
        await expect(
            chatInputCollectionRespond(
                userMutationParent(setup.user.userId),
                { chatTurnId: awaiting.chatTurnId, toolCallId, answers, clientRequestId: idCreate(), assistantOptions },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow(`promptUserForInput tool call not found: ${toolCallId}`);

        const [turn] = await testDb.select().from(chatTurns).where(eq(chatTurns.chatTurnId, awaiting.chatTurnId));
        expect(turn).toMatchObject({ status: 'awaitingInput', revision: 1, clientRequestId: awaiting.clientRequestId });
        expectRunnerNotStarted(setup.serverRuntime);
    });

    it('rejects a tool call that is not promptUserForInput', async () => {
        // Arrange
        const setup = await commandSetup.withUser();
        const chatId = await seedChat(setup.user.userId);
        const toolCallId = idCreate();
        const awaiting = await seedTurn({
            chatId,
            status: 'awaitingInput',
            revision: 1,
            assistantParts: [{ type: 'tool', toolCallId, toolName: 'searchCooks', state: 'inputAvailable' }],
        });

        // Act / Assert
        await expect(
            chatInputCollectionRespond(
                userMutationParent(setup.user.userId),
                { chatTurnId: awaiting.chatTurnId, toolCallId, answers, clientRequestId: idCreate(), assistantOptions },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow(`promptUserForInput tool call not found: ${toolCallId}`);

        const [assistant] = await testDb.select().from(chatMessages).where(eq(chatMessages.chatMessageId, awaiting.assistantMessageId));
        expect(assistant!.body.parts[0]).toMatchObject({ toolName: 'searchCooks', state: 'inputAvailable' });
        expectRunnerNotStarted(setup.serverRuntime);
    });

    it('rolls back when the client request id is already taken', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        const ownerChatId = await seedChat(owner.user.userId);
        const taken = await seedTurn({ chatId: ownerChatId, status: 'complete' });
        const chatId = await seedChat(other.user.userId);
        const toolCallId = idCreate();
        const awaiting = await seedTurn({
            chatId,
            status: 'awaitingInput',
            revision: 2,
            assistantParts: [{ type: 'tool', toolCallId, toolName: 'promptUserForInput', state: 'inputAvailable' }],
        });

        // Act
        let thrown: unknown;
        try {
            await chatInputCollectionRespond(
                userMutationParent(other.user.userId),
                { chatTurnId: awaiting.chatTurnId, toolCallId, answers, clientRequestId: taken.clientRequestId, assistantOptions },
                other.requestingSession,
                other.serverRuntime,
            );
        } catch (error) {
            thrown = error;
        }

        // Assert
        const [turn] = await testDb.select().from(chatTurns).where(eq(chatTurns.chatTurnId, awaiting.chatTurnId));
        const [assistant] = await testDb.select().from(chatMessages).where(eq(chatMessages.chatMessageId, awaiting.assistantMessageId));
        expect(errorText(thrown)).toContain('ChatTurns_clientRequestId_unique');
        expect(turn).toMatchObject({ status: 'awaitingInput', revision: 2, clientRequestId: awaiting.clientRequestId });
        expect(assistant!.body.parts[0]).toMatchObject({ state: 'inputAvailable' });
        expectRunnerNotStarted(other.serverRuntime);
    });

    it('persists the answers then throws when the turn has no user message', async () => {
        // Arrange
        const setup = await commandSetup.withUser();
        const chatId = await seedChat(setup.user.userId, { surface: 'cook' });
        const toolCallId = idCreate();
        const awaiting = await seedTurn({
            chatId,
            status: 'awaitingInput',
            revision: 4,
            includeUser: false,
            assistantParts: [
                { type: 'tool', toolCallId, toolName: 'promptUserForInput', state: 'inputAvailable', input: { fields: ['guests'] } },
            ],
        });
        const clientRequestId = idCreate();

        // Act / Assert
        await expect(
            chatInputCollectionRespond(
                userMutationParent(setup.user.userId),
                { chatTurnId: awaiting.chatTurnId, toolCallId, answers, clientRequestId, assistantOptions },
                setup.requestingSession,
                setup.serverRuntime,
            ),
        ).rejects.toThrow(`Chat turn not found: ${awaiting.chatTurnId}`);

        const [turn] = await testDb.select().from(chatTurns).where(eq(chatTurns.chatTurnId, awaiting.chatTurnId));
        const [assistant] = await testDb.select().from(chatMessages).where(eq(chatMessages.chatMessageId, awaiting.assistantMessageId));
        const tool = assistant!.body.parts[0] as Extract<ChatMessagePart, { type: 'tool' }>;
        expect(turn).toMatchObject({ status: 'queued', clientRequestId, revision: 5 });
        expect(assistant).toMatchObject({ status: 'streaming', revision: 5 });
        expect(tool.state).toBe('outputAvailable');
        expect(tool.output).toEqual(answers);
        expect(setup.serverRuntime.publish.chatTurnUpdates).not.toHaveBeenCalled();
        expect(vi.mocked(chatTurnRunDetached)).not.toHaveBeenCalled();
        expectNoFanout(setup.serverRuntime);
    });
});
