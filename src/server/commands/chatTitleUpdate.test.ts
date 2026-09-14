import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { chats } from '../db/schema';
import { commandSetup, findLogsForSession, testDb, userMutationParent } from '../test/commandTestUtils';
import { chatTitleUpdate } from './chatTitleUpdate';

describe('chatTitleUpdate', () => {
    it('renames the chat and publishes userUpdates', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const chatId = idCreate();
        await testDb.insert(chats).values({
            chatId,
            userId: user.userId,
            surface: 'admin',
            title: '',
            deletedAt: null,
            createdAt: new Date(),
            lastModifiedAt: new Date(),
        });
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();

        const result = await chatTitleUpdate(
            userMutationParent(user.userId),
            { chatId, title: '  Menu help  ' },
            requestingSession,
            serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: chatId });
        const [row] = await testDb.select().from(chats).where(eq(chats.chatId, chatId));
        expect(row!.title).toBe('Menu help');
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('rejects an empty title without publishing', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const chatId = idCreate();
        await testDb.insert(chats).values({
            chatId,
            userId: user.userId,
            surface: 'customer',
            title: 'Keep',
            deletedAt: null,
            createdAt: new Date(),
            lastModifiedAt: new Date(),
        });
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();

        await expect(
            chatTitleUpdate(userMutationParent(user.userId), { chatId, title: '   ' }, requestingSession, serverRuntime),
        ).rejects.toThrow(/title must not be empty/);

        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        const [chatRow] = await testDb.select().from(chats).where(eq(chats.chatId, chatId));
        expect(chatRow!.title).toBe('Keep');
        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(logRows.some((log) => log.level === 'error' && /title must not be empty/.test(log.message))).toBe(true);
    });

    it('rejects a soft-deleted chat', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const chatId = idCreate();
        await testDb.insert(chats).values({
            chatId,
            userId: user.userId,
            surface: 'cook',
            title: 'Gone',
            deletedAt: new Date(),
            createdAt: new Date(),
            lastModifiedAt: new Date(),
        });
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();

        await expect(
            chatTitleUpdate(userMutationParent(user.userId), { chatId, title: 'Nope' }, requestingSession, serverRuntime),
        ).rejects.toThrow(/chat not found/);

        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });
});
