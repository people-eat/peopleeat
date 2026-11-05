import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { chats } from '../db/schema';
import { toGqlAdminAssistantChat } from '../mappers/toGqlAdminAssistantChat';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminAssistantChatFindOne } from './adminAssistantChatFindOne';

describe('adminAssistantChatFindOne', () => {
    it('returns the mapped chat', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        const chatId = idCreate();
        await testDb.insert(chats).values({
            chatId,
            userId: user.userId,
            surface: 'admin',
            title: 'Ops',
            lastModifiedAt: new Date('2026-05-05T00:00:00.000Z'),
        });

        // Act
        const result = await adminAssistantChatFindOne({ chatId }, requestingSession, serverRuntime);

        // Assert
        const [stored] = await testDb.select().from(chats).where(eq(chats.chatId, chatId));
        expect(result).toEqual(toGqlAdminAssistantChat({ ...stored!, userId: stored!.userId!, surface: stored!.surface! }));
    });

    it('returns a soft-deleted chat', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        const chatId = idCreate();
        const deletedAt = new Date('2026-02-02T00:00:00.000Z');
        await testDb.insert(chats).values({
            chatId,
            userId: user.userId,
            surface: 'customer',
            title: 'Removed',
            deletedAt,
        });

        // Act
        const result = await adminAssistantChatFindOne({ chatId }, requestingSession, serverRuntime);

        // Assert
        const [stored] = await testDb.select().from(chats).where(eq(chats.chatId, chatId));
        expect(result).toEqual(toGqlAdminAssistantChat({ ...stored!, userId: stored!.userId!, surface: stored!.surface! }));
        expect(result?.deletedAt).toEqual(deletedAt);
    });

    it('returns null for an unknown id', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();

        // Act
        const result = await adminAssistantChatFindOne({ chatId: idCreate() }, requestingSession, serverRuntime);

        // Assert
        expect(result).toBeNull();
    });

    it('returns null when the chat has no user', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const chatId = idCreate();
        await testDb.insert(chats).values({
            chatId,
            userId: null,
            surface: 'cook',
            title: 'Unowned',
        });

        // Act
        const result = await adminAssistantChatFindOne({ chatId }, requestingSession, serverRuntime);

        // Assert
        expect(result).toBeNull();
    });

    it('returns null when the chat has no surface', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        const chatId = idCreate();
        await testDb.insert(chats).values({
            chatId,
            userId: user.userId,
            surface: null,
            title: 'No rail',
        });

        // Act
        const result = await adminAssistantChatFindOne({ chatId }, requestingSession, serverRuntime);

        // Assert
        expect(result).toBeNull();
    });

    it('returns the chat to a session that does not own it', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const anonymous = await commandSetup();
        const chatId = idCreate();
        await testDb.insert(chats).values({
            chatId,
            userId: owner.user.userId,
            surface: 'customer',
            title: 'Visible to admin',
        });

        // Act
        const result = await adminAssistantChatFindOne({ chatId }, anonymous.requestingSession, anonymous.serverRuntime);

        // Assert
        const [stored] = await testDb.select().from(chats).where(eq(chats.chatId, chatId));
        expect(result).toEqual(toGqlAdminAssistantChat({ ...stored!, userId: stored!.userId!, surface: stored!.surface! }));
    });
});
