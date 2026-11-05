import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { chats } from '../db/schema';
import { toGqlChat } from '../mappers/toGqlChat';
import { toGqlUser } from '../mappers/toGqlUser';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { userAssistantChatFindMany } from './userAssistantChatFindMany';

describe('userAssistantChatFindMany', () => {
    it('orders the owner chats by lastModifiedAt descending and maps each row', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        const olderId = idCreate();
        const newerId = idCreate();
        await testDb.insert(chats).values([
            {
                chatId: olderId,
                userId: user.userId,
                surface: 'customer',
                title: 'older',
                lastModifiedAt: new Date('2026-01-01T00:00:00.000Z'),
            },
            {
                chatId: newerId,
                userId: user.userId,
                surface: 'cook',
                title: 'newer',
                lastModifiedAt: new Date('2026-06-01T00:00:00.000Z'),
            },
        ]);

        // Act
        const rows = await userAssistantChatFindMany(toGqlUser(user), { criterion: {} }, requestingSession, serverRuntime);

        // Assert
        const [storedNewer] = await testDb.select().from(chats).where(eq(chats.chatId, newerId));
        expect(rows?.map((row) => row.chatId)).toEqual([newerId, olderId]);
        expect(rows?.find((row) => row.chatId === newerId)).toEqual(toGqlChat(storedNewer!));
    });

    it('applies skip and take', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        const oldestId = idCreate();
        const middleId = idCreate();
        const newestId = idCreate();
        await testDb.insert(chats).values([
            {
                chatId: oldestId,
                userId: user.userId,
                surface: 'customer',
                title: 'oldest',
                lastModifiedAt: new Date('2026-01-01T00:00:00.000Z'),
            },
            {
                chatId: middleId,
                userId: user.userId,
                surface: 'customer',
                title: 'middle',
                lastModifiedAt: new Date('2026-02-01T00:00:00.000Z'),
            },
            {
                chatId: newestId,
                userId: user.userId,
                surface: 'customer',
                title: 'newest',
                lastModifiedAt: new Date('2026-03-01T00:00:00.000Z'),
            },
        ]);

        // Act
        const rows = await userAssistantChatFindMany(
            toGqlUser(user),
            { criterion: { skip: 1, take: 1 } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows?.map((row) => row.chatId)).toEqual([middleId]);
    });

    it('defaults take to 25', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        const base = Date.parse('2024-01-01T00:00:00.000Z');
        const ids = Array.from({ length: 26 }, () => idCreate());
        await testDb.insert(chats).values(
            ids.map((chatId, index) => ({
                chatId,
                userId: user.userId,
                surface: 'customer' as const,
                title: `page-${index}`,
                lastModifiedAt: new Date(base + index * 1000),
            })),
        );

        // Act
        const rows = await userAssistantChatFindMany(toGqlUser(user), { criterion: {} }, requestingSession, serverRuntime);

        // Assert
        expect(rows?.map((row) => row.chatId)).toEqual([...ids].reverse().slice(0, 25));
    });

    it('filters by surface', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        const customerId = idCreate();
        const cookId = idCreate();
        await testDb.insert(chats).values([
            { chatId: customerId, userId: user.userId, surface: 'customer', title: 'customer rail' },
            { chatId: cookId, userId: user.userId, surface: 'cook', title: 'cook rail' },
        ]);

        // Act
        const rows = await userAssistantChatFindMany(toGqlUser(user), { criterion: { surface: 'cook' } }, requestingSession, serverRuntime);

        // Assert
        expect(rows?.map((row) => row.chatId)).toEqual([cookId]);
    });

    it('filters by case-insensitive title and by chat id', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        const token = idCreate();
        const titledId = idCreate();
        const byId = idCreate();
        const otherId = idCreate();
        await testDb.insert(chats).values([
            { chatId: titledId, userId: user.userId, surface: 'customer', title: `Birthday ${token}` },
            { chatId: byId, userId: user.userId, surface: 'customer', title: 'plain title' },
            { chatId: otherId, userId: user.userId, surface: 'admin', title: 'other' },
        ]);

        // Act
        const byTitle = await userAssistantChatFindMany(
            toGqlUser(user),
            { criterion: { searchText: `birthday ${token}`.toLowerCase() } },
            requestingSession,
            serverRuntime,
        );
        const byChatId = await userAssistantChatFindMany(
            toGqlUser(user),
            { criterion: { searchText: byId } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(byTitle?.map((row) => row.chatId)).toEqual([titledId]);
        expect(byChatId?.map((row) => row.chatId)).toEqual([byId]);
    });

    it('strips like wildcards before matching search text', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        const token = idCreate();
        const literalId = idCreate();
        const wildcardId = idCreate();
        await testDb.insert(chats).values([
            { chatId: literalId, userId: user.userId, surface: 'customer', title: `${token}-ab` },
            { chatId: wildcardId, userId: user.userId, surface: 'customer', title: `${token}-aXb` },
        ]);

        // Act
        const rows = await userAssistantChatFindMany(
            toGqlUser(user),
            { criterion: { searchText: `${token}-a_b` } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows?.map((row) => row.chatId)).toEqual([literalId]);
    });

    it('treats blank search text as no text filter', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        const olderId = idCreate();
        const newerId = idCreate();
        await testDb.insert(chats).values([
            {
                chatId: olderId,
                userId: user.userId,
                surface: 'admin',
                title: 'alpha',
                lastModifiedAt: new Date('2026-01-01T00:00:00.000Z'),
            },
            {
                chatId: newerId,
                userId: user.userId,
                surface: 'customer',
                title: 'beta',
                lastModifiedAt: new Date('2026-04-01T00:00:00.000Z'),
            },
        ]);

        // Act
        const rows = await userAssistantChatFindMany(
            toGqlUser(user),
            { criterion: { searchText: ' \n\t ' } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows?.map((row) => row.chatId)).toEqual([newerId, olderId]);
    });

    it('excludes deleted chats, chats with no surface, and chats with no user', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        const liveId = idCreate();
        await testDb.insert(chats).values([
            { chatId: liveId, userId: user.userId, surface: 'customer', title: 'live' },
            { chatId: idCreate(), userId: user.userId, surface: 'customer', title: 'deleted', deletedAt: new Date() },
            { chatId: idCreate(), userId: user.userId, surface: null, title: 'no surface' },
            { chatId: idCreate(), userId: null, surface: 'customer', title: 'no user' },
        ]);

        // Act
        const rows = await userAssistantChatFindMany(toGqlUser(user), { criterion: {} }, requestingSession, serverRuntime);

        // Assert
        expect(rows?.map((row) => row.chatId)).toEqual([liveId]);
    });

    it('returns an empty list when nothing matches', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();
        await testDb.insert(chats).values({
            chatId: idCreate(),
            userId: user.userId,
            surface: 'customer',
            title: 'visible',
        });

        // Act
        const rows = await userAssistantChatFindMany(
            toGqlUser(user),
            { criterion: { searchText: `missing-${idCreate()}` } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows).toEqual([]);
    });

    it('returns an empty list when the user has no chats', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser();

        // Act
        const rows = await userAssistantChatFindMany(toGqlUser(user), { criterion: {} }, requestingSession, serverRuntime);

        // Assert
        expect(rows).toEqual([]);
    });

    it('returns null when the session does not own the parent user', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        await testDb.insert(chats).values({
            chatId: idCreate(),
            userId: owner.user.userId,
            surface: 'customer',
            title: 'owned',
        });

        // Act
        const rows = await userAssistantChatFindMany(
            toGqlUser(owner.user),
            { criterion: {} },
            other.requestingSession,
            other.serverRuntime,
        );

        // Assert
        expect(rows).toBeNull();
    });

    it('returns null when the session has no user', async () => {
        // Arrange
        const owner = await commandSetup.withUser();
        const anonymous = await commandSetup();
        await testDb.insert(chats).values({
            chatId: idCreate(),
            userId: owner.user.userId,
            surface: 'customer',
            title: 'owned',
        });

        // Act
        const rows = await userAssistantChatFindMany(
            toGqlUser(owner.user),
            { criterion: {} },
            anonymous.requestingSession,
            anonymous.serverRuntime,
        );

        // Assert
        expect(rows).toBeNull();
    });
});
