import { and, eq, isNull } from 'drizzle-orm';

import { chats } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession, GqlSUserMutation, GqlSUserMutationChatDeleteArgs } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

/** Soft-delete an owned assistant chat (`deletedAt`). Hidden from owner lists. */
export async function chatDelete(
    { userId }: GqlSUserMutation,
    { chatId }: GqlSUserMutationChatDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    try {
        const now = new Date();
        const updated = await serverRuntime.db
            .update(chats)
            .set({ deletedAt: now, lastModifiedAt: now })
            .where(and(eq(chats.chatId, chatId), eq(chats.userId, userId), isNull(chats.deletedAt)))
            .returning({ chatId: chats.chatId });

        if (updated.length === 0) {
            throw new Error('chatDelete: chat not found');
        }

        await serverRuntime.publish.userUpdates({ userId });
        return { success: true, referenceId: chatId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
