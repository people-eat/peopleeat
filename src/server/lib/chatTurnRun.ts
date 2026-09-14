import { and, eq, lt, sql } from 'drizzle-orm';

import { chatMessages, chats, chatTurns } from '../db/schema';
import type { ChatMessageBody } from '../domain/chatMessageBody';
import { chatMessageBodyRead } from '../domain/chatTurn';
import type { ChatTurnAggregate, ChatTurnCompletion, ChatTurnFunction } from '../domain/chatTurn';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { chatTitleGenerate } from '../jobs/handlers/chatTitleGenerate';
import { chatTurnFindOne } from './chatTurnFindOne';

const PERSISTENCE_INTERVAL_MS = 75;

async function chatTurnPublish(serverRuntime: ServerRuntime, aggregate: ChatTurnAggregate): Promise<void> {
    try {
        await serverRuntime.publish.chatTurnUpdates({
            chatId: aggregate.turn.chatId,
            chatTurnId: aggregate.turn.chatTurnId,
            revision: aggregate.turn.revision,
        });
    } catch (error) {
        serverRuntime.log.error(error);
    }
}

async function chatTurnHistoryRead(serverRuntime: ServerRuntime, aggregate: ChatTurnAggregate): Promise<ChatMessageBody[]> {
    const rows = await serverRuntime.db
        .select({ message: chatMessages })
        .from(chatMessages)
        .innerJoin(chatTurns, eq(chatMessages.chatTurnId, chatTurns.chatTurnId))
        .where(
            and(
                eq(chatTurns.chatId, aggregate.turn.chatId),
                eq(chatTurns.status, 'complete'),
                lt(chatTurns.sequence, aggregate.turn.sequence),
            ),
        )
        .orderBy(chatTurns.sequence, sql`case when ${chatMessages.role} = 'user' then 0 else 1 end`);

    const history = rows
        .map(({ message }) => message)
        .filter((message) => message.status === 'complete')
        .map((message) => chatMessageBodyRead(message));
    const withUser = [...history, chatMessageBodyRead(aggregate.userMessage)];
    // Continue paths (approval / promptUserForInput) resume the same turn with
    // a non-empty assistant body — include it so the SDK sees tool state.
    const assistantBody = chatMessageBodyRead(aggregate.assistantMessage);
    if (assistantBody.parts.length > 0) {
        return [...withUser, assistantBody];
    }
    return withUser;
}

function structuralStateRead(message: ChatMessageBody): string {
    return JSON.stringify(
        message.parts.map((part) => ({
            type: part.type,
            state: 'state' in part ? part.state : undefined,
            toolCallId: 'toolCallId' in part ? part.toolCallId : undefined,
        })),
    );
}

async function chatTurnMessagePersist(
    serverRuntime: ServerRuntime,
    aggregate: ChatTurnAggregate,
    body: ChatMessageBody,
    status: 'streaming' | 'complete',
): Promise<ChatTurnAggregate> {
    const now = new Date();
    const complete = status === 'complete';
    await serverRuntime.db.transaction(async (transaction) => {
        await transaction
            .update(chatMessages)
            .set({
                body,
                status: complete ? 'complete' : 'streaming',
                lastModifiedAt: now,
                revision: sql`${chatMessages.revision} + 1`,
            })
            .where(eq(chatMessages.chatMessageId, aggregate.assistantMessage.chatMessageId));
        await transaction
            .update(chatTurns)
            .set({
                lastModifiedAt: now,
                revision: sql`${chatTurns.revision} + 1`,
            })
            .where(eq(chatTurns.chatTurnId, aggregate.turn.chatTurnId));
        await transaction.update(chats).set({ lastModifiedAt: now }).where(eq(chats.chatId, aggregate.turn.chatId));
    });
    return chatTurnFindOne(serverRuntime, aggregate.turn.chatTurnId);
}

async function streamNextOrDeadline(
    next: Promise<IteratorResult<ChatMessageBody>>,
    waitMs: number,
): Promise<{ kind: 'next'; result: IteratorResult<ChatMessageBody> } | { kind: 'deadline' }> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            next.then((result) => ({ kind: 'next' as const, result })),
            new Promise<{ kind: 'deadline' }>((resolve) => {
                timeout = setTimeout(() => resolve({ kind: 'deadline' }), waitMs);
            }),
        ]);
    } finally {
        clearTimeout(timeout);
    }
}

interface ChatTurnStreamState {
    aggregate: ChatTurnAggregate;
    body: ChatMessageBody;
    hasUnpersistedDelta: boolean;
    lastPersistedAt: number;
    lastStructuralState: string;
}

async function chatTurnStreamConsume(
    serverRuntime: ServerRuntime,
    initialAggregate: ChatTurnAggregate,
    updates: AsyncIterable<ChatMessageBody>,
): Promise<{ aggregate: ChatTurnAggregate; body: ChatMessageBody }> {
    const initialBody = chatMessageBodyRead(initialAggregate.assistantMessage);
    const iterator = updates[Symbol.asyncIterator]();

    const persist = async (state: ChatTurnStreamState): Promise<ChatTurnStreamState> => {
        const aggregate = await chatTurnMessagePersist(serverRuntime, state.aggregate, state.body, 'streaming');
        await chatTurnPublish(serverRuntime, aggregate);
        return {
            ...state,
            aggregate,
            hasUnpersistedDelta: false,
            lastPersistedAt: Date.now(),
            lastStructuralState: structuralStateRead(state.body),
        };
    };

    const read = async (
        state: ChatTurnStreamState,
        next: Promise<IteratorResult<ChatMessageBody>>,
    ): Promise<{ kind: 'next'; result: IteratorResult<ChatMessageBody> } | { kind: 'deadline' }> => {
        if (!state.hasUnpersistedDelta) {
            return { kind: 'next', result: await next };
        }
        const waitMs = PERSISTENCE_INTERVAL_MS - (Date.now() - state.lastPersistedAt);
        return waitMs <= 0 ? { kind: 'deadline' } : streamNextOrDeadline(next, waitMs);
    };

    const consume = async (state: ChatTurnStreamState, next: Promise<IteratorResult<ChatMessageBody>>): Promise<ChatTurnStreamState> => {
        const outcome = await read(state, next);
        if (outcome.kind === 'deadline') {
            return consume(await persist(state), next);
        }
        if (outcome.result.done) {
            return state;
        }

        const body: ChatMessageBody = {
            ...outcome.result.value,
            id: state.aggregate.assistantMessage.chatMessageId,
            role: 'assistant',
        };
        const shouldPersist =
            structuralStateRead(body) !== state.lastStructuralState || Date.now() - state.lastPersistedAt >= PERSISTENCE_INTERVAL_MS;
        const updated = { ...state, body, hasUnpersistedDelta: !shouldPersist };
        return consume(shouldPersist ? await persist(updated) : updated, iterator.next());
    };

    try {
        const completed = await consume(
            {
                aggregate: initialAggregate,
                body: initialBody,
                hasUnpersistedDelta: false,
                lastPersistedAt: 0,
                lastStructuralState: structuralStateRead(initialBody),
            },
            iterator.next(),
        );
        return { aggregate: completed.aggregate, body: completed.body };
    } finally {
        await iterator.return?.();
    }
}

async function chatTurnFinish(
    serverRuntime: ServerRuntime,
    aggregate: ChatTurnAggregate,
    body: ChatMessageBody,
    completion: ChatTurnCompletion | undefined,
): Promise<ChatTurnAggregate> {
    const awaitsInput = body.parts.some((part) => {
        if (part.type !== 'tool') return false;
        return part.state === 'approvalRequested' || (part.state === 'inputAvailable' && !part.providerExecuted);
    });
    const now = new Date();
    await serverRuntime.db.transaction(async (transaction) => {
        await transaction
            .update(chatMessages)
            .set({
                body,
                status: awaitsInput ? 'streaming' : 'complete',
                lastModifiedAt: now,
                revision: sql`${chatMessages.revision} + 1`,
            })
            .where(eq(chatMessages.chatMessageId, aggregate.assistantMessage.chatMessageId));
        await transaction
            .update(chatTurns)
            .set({
                status: awaitsInput ? 'awaitingInput' : 'complete',
                agentName: completion?.agentName,
                modelId: completion?.modelId,
                finishReason: completion?.finishReason,
                usage: completion?.usage,
                completedAt: awaitsInput ? null : now,
                lastModifiedAt: now,
                revision: sql`${chatTurns.revision} + 1`,
            })
            .where(eq(chatTurns.chatTurnId, aggregate.turn.chatTurnId));
        await transaction.update(chats).set({ lastModifiedAt: now }).where(eq(chats.chatId, aggregate.turn.chatId));
    });
    return chatTurnFindOne(serverRuntime, aggregate.turn.chatTurnId);
}

async function chatTurnFail(serverRuntime: ServerRuntime, chatTurnId: string): Promise<ChatTurnAggregate> {
    const now = new Date();
    const aggregate = await chatTurnFindOne(serverRuntime, chatTurnId);
    if (aggregate.turn.status !== 'running') {
        return aggregate;
    }
    await serverRuntime.db.transaction(async (transaction) => {
        const [failedTurn] = await transaction
            .update(chatTurns)
            .set({
                status: 'failed',
                failureCode: 'TURN_EXECUTION_FAILED',
                completedAt: now,
                lastModifiedAt: now,
                revision: sql`${chatTurns.revision} + 1`,
            })
            .where(and(eq(chatTurns.chatTurnId, chatTurnId), eq(chatTurns.status, 'running')))
            .returning({ chatTurnId: chatTurns.chatTurnId });
        if (failedTurn) {
            await transaction
                .update(chatMessages)
                .set({
                    status: 'failed',
                    lastModifiedAt: now,
                    revision: sql`${chatMessages.revision} + 1`,
                })
                .where(eq(chatMessages.chatMessageId, aggregate.assistantMessage.chatMessageId));
            await transaction.update(chats).set({ lastModifiedAt: now }).where(eq(chats.chatId, aggregate.turn.chatId));
        }
    });
    return chatTurnFindOne(serverRuntime, chatTurnId);
}

/**
 * Durable turn runner: coalesce text persist (~75ms), immediate structural
 * persist, publish-after-commit, finish awaitingInput or complete, fail on error.
 */
export async function chatTurnRun(serverRuntime: ServerRuntime, chatTurnId: string, turnFunction: ChatTurnFunction): Promise<void> {
    try {
        const now = new Date();
        const [started] = await serverRuntime.db
            .update(chatTurns)
            .set({ status: 'running', startedAt: now, lastModifiedAt: now, revision: sql`${chatTurns.revision} + 1` })
            .where(and(eq(chatTurns.chatTurnId, chatTurnId), eq(chatTurns.status, 'queued')))
            .returning({ chatTurnId: chatTurns.chatTurnId });
        if (!started) {
            return;
        }

        let aggregate = await chatTurnFindOne(serverRuntime, chatTurnId);
        await chatTurnPublish(serverRuntime, aggregate);

        const messages = await chatTurnHistoryRead(serverRuntime, aggregate);
        const execution = await turnFunction({
            turn: aggregate.turn,
            assistantMessageId: aggregate.assistantMessage.chatMessageId,
            messages,
        });
        const streamed = await chatTurnStreamConsume(serverRuntime, aggregate, execution.updates);
        aggregate = streamed.aggregate;

        const completion = await execution.completion;
        aggregate = await chatTurnFinish(serverRuntime, aggregate, streamed.body, completion);
        await chatTurnPublish(serverRuntime, aggregate);
        if (aggregate.turn.status === 'complete') {
            try {
                await serverRuntime.jobs.enqueue(chatTitleGenerate, { chatId: aggregate.turn.chatId });
            } catch (error) {
                serverRuntime.log.error(error);
            }
        }
    } catch (error) {
        serverRuntime.log.error(error);
        try {
            const aggregate = await chatTurnFail(serverRuntime, chatTurnId);
            await chatTurnPublish(serverRuntime, aggregate);
        } catch (failureError) {
            serverRuntime.log.error(failureError);
        }
    }
}
