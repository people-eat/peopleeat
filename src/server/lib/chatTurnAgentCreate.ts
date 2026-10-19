import type { TextStreamPart, ToolSet } from 'ai';
import { toUIMessageStream } from 'ai';

import { agentAdminCreate } from '../agents/agentAdminCreate';
import { agentCookCreate } from '../agents/agentCookCreate';
import { agentCustomerCreate } from '../agents/agentCustomerCreate';
import type { ChatSurface } from '../domain/chatMessage';
import { chatMessageBodiesToModelMessages, chatMessageBodyUpdatesFromAiStream } from '../domain/chatMessageAiAdapter';
import { chatMessageBodyEmpty } from '../domain/chatMessageBody';
import type { ChatTurnFunction } from '../domain/chatTurn';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSChatAssistantOptions, GqlSSession } from '../graphql/generated';
import { withAiTraceAttributes } from '../observability/aiTelemetry';

type ChatTurnAgentOptions = {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    assistantOptions: GqlSChatAssistantOptions;
    surface: ChatSurface;
};

type AgentStreamResult = {
    stream: ReadableStream<TextStreamPart<ToolSet>>;
    finishReason: PromiseLike<string>;
    usage: PromiseLike<{
        inputTokens: number | undefined;
        outputTokens: number | undefined;
        totalTokens: number | undefined;
        outputTokenDetails: { reasoningTokens: number | undefined };
        inputTokenDetails: { cacheReadTokens: number | undefined };
    }>;
    finalStep: PromiseLike<{ response: { modelId: string } }>;
    agentId: string;
};

/**
 * Build a `ChatTurnFunction` for the given chat surface.
 * Admin uses the demo-capable admin factory; customer/cook use scaffolds until
 * their tool catalogs land.
 */
export function chatTurnAgentCreate({ serverRuntime, session, assistantOptions, surface }: ChatTurnAgentOptions): ChatTurnFunction {
    return async ({ turn, assistantMessageId, messages }) => {
        const onStepEnd = async () => {};
        const modelMessages = await chatMessageBodiesToModelMessages(messages);

        const streamed = await withAiTraceAttributes(
            {
                traceName: `chat-turn-${surface}`,
                userId: session.userId ?? undefined,
                sessionId: turn.chatId,
                tags: ['chat', surface],
                metadata: {
                    chatTurnId: turn.chatTurnId,
                    surface,
                },
            },
            async (): Promise<AgentStreamResult> => {
                if (surface === 'admin') {
                    const agent = await agentAdminCreate({
                        serverRuntime,
                        assistantOptions,
                        session,
                        onStepEnd,
                    });
                    const result = await agent.stream({ messages: modelMessages });
                    return {
                        stream: result.stream as ReadableStream<TextStreamPart<ToolSet>>,
                        finishReason: result.finishReason,
                        usage: result.usage,
                        finalStep: result.finalStep,
                        agentId: agent.id ?? 'assistant-admin',
                    };
                }
                if (surface === 'cook') {
                    const agent = await agentCookCreate({
                        serverRuntime,
                        session,
                        assistantOptions,
                        onStepEnd,
                    });
                    const result = await agent.stream({ messages: modelMessages });
                    return {
                        stream: result.stream as ReadableStream<TextStreamPart<ToolSet>>,
                        finishReason: result.finishReason,
                        usage: result.usage,
                        finalStep: result.finalStep,
                        agentId: agent.id ?? 'assistant-cook',
                    };
                }
                const agent = await agentCustomerCreate({ serverRuntime, onStepEnd });
                const result = await agent.stream({ messages: modelMessages });
                return {
                    stream: result.stream as ReadableStream<TextStreamPart<ToolSet>>,
                    finishReason: result.finishReason,
                    usage: result.usage,
                    finalStep: result.finalStep,
                    agentId: agent.id ?? 'assistant-customer',
                };
            },
        );

        return {
            updates: chatMessageBodyUpdatesFromAiStream({
                initialMessage: chatMessageBodyEmpty({ id: assistantMessageId, role: 'assistant' }),
                stream: toUIMessageStream({
                    stream: streamed.stream,
                    generateMessageId: () => assistantMessageId,
                    sendSources: true,
                }),
            }),
            completion: Promise.all([streamed.finishReason, streamed.usage, streamed.finalStep]).then(
                ([finishReason, usage, finalStep]) => ({
                    agentName: streamed.agentId,
                    modelId: finalStep.response.modelId,
                    finishReason,
                    usage: {
                        inputTokens: usage.inputTokens,
                        outputTokens: usage.outputTokens,
                        totalTokens: usage.totalTokens,
                        reasoningTokens: usage.outputTokenDetails.reasoningTokens,
                        cachedInputTokens: usage.inputTokenDetails.cacheReadTokens,
                    },
                }),
            ),
        };
    };
}
