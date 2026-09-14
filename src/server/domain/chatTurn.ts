import { idCreate } from '../../shared/idCreate';
import type { ChatMessage, ChatMessageCreate, ChatTurn, ChatTurnCreate } from '../db/schema';
import { chatMessageBodyEmpty } from './chatMessageBody';
import type { ChatMessageBody, ChatTurnUsage } from './chatMessageBody';

export interface ChatTurnAggregate {
    turn: ChatTurn;
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
}

export interface ChatTurnAggregateCreate {
    turn: ChatTurnCreate;
    userMessage: ChatMessageCreate;
    assistantMessage: ChatMessageCreate;
}

interface ChatTurnContext {
    turn: ChatTurn;
    assistantMessageId: string;
    messages: ChatMessageBody[];
}

export interface ChatTurnCompletion {
    agentName?: string;
    modelId?: string;
    finishReason?: string;
    usage?: ChatTurnUsage;
}

interface ChatTurnExecution {
    updates: AsyncIterable<ChatMessageBody>;
    completion?: Promise<ChatTurnCompletion>;
}

export type ChatTurnFunction = (context: ChatTurnContext) => ChatTurnExecution | Promise<ChatTurnExecution>;

/** Build insert rows for a new turn: complete user message + empty pending assistant. */
export function chatTurnAggregateBuild({
    chatId,
    clientRequestId,
    locale,
    message,
}: {
    chatId: string;
    clientRequestId: string;
    locale?: 'de' | 'en';
    message: string;
}): ChatTurnAggregateCreate {
    const chatTurnId = idCreate();
    const userMessageId = idCreate();
    const assistantMessageId = idCreate();
    const userBody: ChatMessageBody = {
        ...chatMessageBodyEmpty({ id: userMessageId, role: 'user' }),
        parts: [{ type: 'text', text: message, state: 'done' }],
    };
    const assistantBody = chatMessageBodyEmpty({ id: assistantMessageId, role: 'assistant' });

    return {
        turn: {
            chatTurnId,
            chatId,
            clientRequestId,
            locale,
            status: 'queued',
            revision: 0,
        },
        userMessage: {
            chatMessageId: userMessageId,
            chatTurnId,
            role: 'user',
            status: 'complete',
            revision: 0,
            body: userBody,
        },
        assistantMessage: {
            chatMessageId: assistantMessageId,
            chatTurnId,
            role: 'assistant',
            status: 'pending',
            revision: 0,
            body: assistantBody,
        },
    };
}

export function chatMessageBodyRead(message: ChatMessage): ChatMessageBody {
    return message.body;
}
