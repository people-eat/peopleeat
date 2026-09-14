import { and, eq, isNull } from 'drizzle-orm';

import { chats } from '../db/schema';
import { chatTitleNormalize } from '../domain/chatTitle';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation, GqlSUserMutationChatTitleUpdateArgs } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

/** Owner rename. Non-empty title locks the auto-titler (see chat-titles.md). */
export async function chatTitleUpdate(
    { userId }: GqlSUserMutation,
    { chatId, title }: GqlSUserMutationChatTitleUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    try {
        const normalized = chatTitleNormalize(title);
        if (!normalized) {
            throw new Error('chatTitleUpdate: title must not be empty');
        }

        const now = new Date();
        const updated = await serverRuntime.db
            .update(chats)
            .set({ title: normalized, lastModifiedAt: now })
            .where(and(eq(chats.chatId, chatId), eq(chats.userId, userId), isNull(chats.deletedAt)))
            .returning({ chatId: chats.chatId });

        if (updated.length === 0) {
            throw new Error('chatTitleUpdate: chat not found');
        }

        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: chatId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
