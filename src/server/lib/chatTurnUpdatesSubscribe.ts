import { and, eq } from 'drizzle-orm';

import { admins, chats } from '../db/schema';
import type { ChatTurnUpdateWirePayload, ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSChatTurnUpdate, GqlSSession, GqlSSubscriptionChatTurnUpdatesArgs } from '../graphql/generated';
import { chatDebugEnabled, toGqlChatTurn } from '../mappers/toGqlChatTurn';
import { asyncIterablePrepend } from './asyncIterablePrepend';
import { chatTurnAggregateFindMany, chatTurnAggregateFindManyByChatId } from './chatTurnAggregateFindMany';
import { chatTurnFindOne } from './chatTurnFindOne';

async function* chatTurnUpdatesMap(
    serverRuntime: ServerRuntime,
    includeDebug: boolean,
    updates: AsyncIterable<ChatTurnUpdateWirePayload>,
): AsyncGenerator<GqlSChatTurnUpdate> {
    for await (const update of updates) {
        const aggregate = await chatTurnFindOne(serverRuntime, update.chatTurnId);
        yield {
            gqlTypeName: 'ChatTurnUpserted',
            turn: toGqlChatTurn(aggregate, { includeDebug }),
        };
    }
}

/** Ownership-auth subscription: snapshot then live upserts for one chat. */
export async function chatTurnUpdatesSubscribe(
    args: GqlSSubscriptionChatTurnUpdatesArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<AsyncGenerator<GqlSChatTurnUpdate>> {
    const userId = requestingSession.userId;
    if (!userId) {
        throw new Error('chatTurnUpdates requires a signed-in user');
    }

    const [owned] = await serverRuntime.db
        .select({ chatId: chats.chatId })
        .from(chats)
        .where(and(eq(chats.chatId, args.chatId), eq(chats.userId, userId)))
        .limit(1);

    const [adminRow] = await serverRuntime.db.select({ adminId: admins.adminId }).from(admins).where(eq(admins.adminId, userId)).limit(1);
    const isAdmin = Boolean(adminRow);

    if (!owned && !isAdmin) {
        throw new Error(`Chat not found or not owned: ${args.chatId}`);
    }

    const updates = serverRuntime.subscribe.to(`chat-turn-updates:${args.chatId}`) as AsyncIterableIterator<ChatTurnUpdateWirePayload>;
    try {
        // Admins (own rail + inspecting others) always get tool input/output for the inspector.
        const includeDebug = chatDebugEnabled() || isAdmin;
        const aggregates = owned
            ? await chatTurnAggregateFindMany(serverRuntime, args.chatId, userId)
            : await chatTurnAggregateFindManyByChatId(serverRuntime, args.chatId);
        return asyncIterablePrepend<GqlSChatTurnUpdate>(
            {
                gqlTypeName: 'ChatTurnSnapshot',
                turns: aggregates.map((aggregate) => toGqlChatTurn(aggregate, { includeDebug })),
            },
            chatTurnUpdatesMap(serverRuntime, includeDebug, updates),
        );
    } catch (error) {
        await updates.return?.();
        throw error;
    }
}
