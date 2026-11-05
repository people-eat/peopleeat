import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { chats } from '../db/schema';
import { toGqlChat } from '../mappers/toGqlChat';
import { toGqlUser } from '../mappers/toGqlUser';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { userAssistantChatFindOne } from './userAssistantChatFindOne';

describe('userAssistantChatFindOne', () => {
    it('returns the mapped chat', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        const chatId = idCreate();
        await testDb.insert(chats).values({
            chatId,
            userId: user.userId,
            surface: 'cook',
            title: 'Menu help',
            lastModifiedAt: new Date('2026-04-04T00:00:00.000Z'),
        });

        // Act
        const result = await userAssistantChatFindOne(toGqlUser(user), { chatId }, requestingSession, serverRuntime);

        // Assert
        const [stored] = await testDb.select().from(chats).where(eq(chats.chatId, chatId));
        expect(result).toEqual(toGqlChat(stored!));
    });

    it('returns null for an unknown id', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();

        // Act
        const result = await userAssistantChatFindOne(toGqlUser(user), { chatId: idCreate() }, requestingSession, serverRuntime);

        // Assert
        expect(result).toBeNull();
    });

    it('returns null when the chat is soft-deleted', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        const chatId = idCreate();
        await testDb.insert(chats).values({
            chatId,
            userId: user.userId,
            surface: 'customer',
            title: 'Gone',
            deletedAt: new Date('2026-01-02T00:00:00.000Z'),
        });

        // Act
        const result = await userAssistantChatFindOne(toGqlUser(user), { chatId }, requestingSession, serverRuntime);

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
        const result = await userAssistantChatFindOne(toGqlUser(user), { chatId }, requestingSession, serverRuntime);

        // Assert
        expect(result).toBeNull();
    });

    it('returns null when the chat belongs to another user', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        const chatId = idCreate();
        await testDb.insert(chats).values({
            chatId,
            userId: owner.user.userId,
            surface: 'admin',
            title: 'Not yours',
        });

        // Act
        const result = await userAssistantChatFindOne(toGqlUser(other.user), { chatId }, other.requestingSession, other.serverRuntime);

        // Assert
        expect(result).toBeNull();
    });

    it('returns null when the session does not own the parent user', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        const chatId = idCreate();
        await testDb.insert(chats).values({
            chatId,
            userId: owner.user.userId,
            surface: 'customer',
            title: 'Owned',
        });

        // Act
        const result = await userAssistantChatFindOne(toGqlUser(owner.user), { chatId }, other.requestingSession, other.serverRuntime);

        // Assert
        expect(result).toBeNull();
    });

    it('returns null when the session has no user', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const anonymous = await commandSetup();
        const chatId = idCreate();
        await testDb.insert(chats).values({
            chatId,
            userId: owner.user.userId,
            surface: 'customer',
            title: 'Owned',
        });

        // Act
        const result = await userAssistantChatFindOne(
            toGqlUser(owner.user),
            { chatId },
            anonymous.requestingSession,
            anonymous.serverRuntime,
        );

        // Assert
        expect(result).toBeNull();
    });
});
