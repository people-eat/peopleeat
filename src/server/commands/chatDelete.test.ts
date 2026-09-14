import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { chats } from '../db/schema';
import { commandSetup, findLogsForSession, testDb, userMutationParent } from '../test/commandTestUtils';
import { chatDelete } from './chatDelete';

describe('chatDelete', () => {
    it('soft-deletes the chat and publishes userUpdates', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const chatId = idCreate();
        await testDb.insert(chats).values({
            chatId,
            userId: user.userId,
            surface: 'admin',
            title: 'Test',
            deletedAt: null,
            createdAt: new Date(),
            lastModifiedAt: new Date(),
        });
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();

        const result = await chatDelete(userMutationParent(user.userId), { chatId }, requestingSession, serverRuntime);

        expect(result).toEqual({ success: true, referenceId: chatId });
        const [row] = await testDb.select().from(chats).where(eq(chats.chatId, chatId));
        expect(row!.deletedAt).not.toBeNull();
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('rejects a missing or already deleted chat without publishing', async () => {
        const { serverRuntime, requestingSession, user } = await commandSetup.withUser();
        const missingId = idCreate();
        vi.mocked(serverRuntime.publish.userUpdates).mockClear();

        await expect(chatDelete(userMutationParent(user.userId), { chatId: missingId }, requestingSession, serverRuntime)).rejects.toThrow(
            /chat not found/,
        );

        expect(serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(requestingSession.sessionId);
        expect(logRows.some((row) => row.level === 'error' && /chat not found/.test(row.message))).toBe(true);
    });

    it('rejects a chat owned by another user', async () => {
        const owner = await commandSetup.withUser();
        const other = await commandSetup.withUser();
        const chatId = idCreate();
        await testDb.insert(chats).values({
            chatId,
            userId: owner.user.userId,
            surface: 'cook',
            title: 'Owned',
            deletedAt: null,
            createdAt: new Date(),
            lastModifiedAt: new Date(),
        });
        vi.mocked(other.serverRuntime.publish.userUpdates).mockClear();

        await expect(
            chatDelete(userMutationParent(other.user.userId), { chatId }, other.requestingSession, other.serverRuntime),
        ).rejects.toThrow(/chat not found/);

        const [row] = await testDb.select().from(chats).where(eq(chats.chatId, chatId));
        expect(row!.deletedAt).toBeNull();
        expect(other.serverRuntime.publish.userUpdates).not.toHaveBeenCalled();
    });
});
