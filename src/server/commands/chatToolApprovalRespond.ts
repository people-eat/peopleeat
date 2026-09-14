import { and, eq, sql } from 'drizzle-orm';

import { chatMessages, chats, chatTurns } from '../db/schema';
import type { ChatSurface } from '../domain/chatMessage';
import type { ChatMessageBody } from '../domain/chatMessageBody';
import { chatMessageBodyRead } from '../domain/chatTurn';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSChatMessageCreateResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationChatToolApprovalRespondArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { chatTurnFindOne } from '../lib/chatTurnFindOne';
import { chatTurnFindOneByClientRequestId } from '../lib/chatTurnFindOneByClientRequestId';
import { chatTurnRunDetached } from '../lib/chatTurnRunDetached';

/**
 * Persist approval on the awaiting tool part and resume the turn runner.
 * Does not call `execute` — the SDK collects approvals on resume.
 */
export async function chatToolApprovalRespond(
    { userId }: GqlSUserMutation,
    { chatTurnId, approvalId, approved, reason, clientRequestId, assistantOptions }: GqlSUserMutationChatToolApprovalRespondArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSChatMessageCreateResult | null> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const existing = await chatTurnFindOneByClientRequestId(serverRuntime, clientRequestId, userId);
    if (existing) {
        await serverRuntime.publish.chatTurnUpdates({
            chatId: existing.turn.chatId,
            chatTurnId: existing.turn.chatTurnId,
            revision: existing.turn.revision,
        });
        return { chatId: existing.turn.chatId, chatTurnId: existing.turn.chatTurnId };
    }

    const now = new Date();
    let surface: ChatSurface = 'customer';

    await serverRuntime.db.transaction(async (transaction) => {
        const [row] = await transaction
            .select({ turn: chatTurns, chat: chats, message: chatMessages })
            .from(chatTurns)
            .innerJoin(chats, eq(chats.chatId, chatTurns.chatId))
            .innerJoin(chatMessages, and(eq(chatMessages.chatTurnId, chatTurns.chatTurnId), eq(chatMessages.role, 'assistant')))
            .where(and(eq(chatTurns.chatTurnId, chatTurnId), eq(chats.userId, userId), eq(chatTurns.status, 'awaitingInput')))
            .limit(1);
        if (!row) {
            throw new Error(`No awaiting turn for approval: ${chatTurnId}`);
        }
        if (!row.chat.surface) {
            throw new Error(`Chat ${row.chat.chatId} has no surface`);
        }
        surface = row.chat.surface;

        const body = chatMessageBodyRead(row.message);
        const toolPartIndex = body.parts.findIndex((part) => part.type === 'tool' && part.approval?.approvalId === approvalId);
        if (toolPartIndex < 0) {
            throw new Error(`Approval not found on turn: ${approvalId}`);
        }
        const nextParts = body.parts.map((part, index) => {
            if (index !== toolPartIndex || part.type !== 'tool' || !part.approval) return part;
            return {
                ...part,
                state: 'approvalResponded' as const,
                approval: {
                    approvalId,
                    status: approved ? ('approved' as const) : ('denied' as const),
                    descriptor: part.approval.descriptor,
                    reason: reason ?? undefined,
                },
            };
        });

        const nextBody: ChatMessageBody = { ...body, parts: nextParts };
        await transaction
            .update(chatMessages)
            .set({
                body: nextBody,
                status: 'streaming',
                lastModifiedAt: now,
                revision: sql`${chatMessages.revision} + 1`,
            })
            .where(eq(chatMessages.chatMessageId, row.message.chatMessageId));
        await transaction
            .update(chatTurns)
            .set({
                status: 'queued',
                clientRequestId,
                lastModifiedAt: now,
                revision: sql`${chatTurns.revision} + 1`,
            })
            .where(eq(chatTurns.chatTurnId, chatTurnId));
        await transaction.update(chats).set({ lastModifiedAt: now }).where(eq(chats.chatId, row.chat.chatId));
    });

    const aggregate = await chatTurnFindOne(serverRuntime, chatTurnId);
    await serverRuntime.publish.chatTurnUpdates({
        chatId: aggregate.turn.chatId,
        chatTurnId: aggregate.turn.chatTurnId,
        revision: aggregate.turn.revision,
    });

    chatTurnRunDetached({
        chatTurnId,
        surface,
        assistantOptions,
        requestingSession,
        serverRuntime,
    });

    return { chatId: aggregate.turn.chatId, chatTurnId };
}
