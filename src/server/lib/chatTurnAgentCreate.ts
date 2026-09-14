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

type ChatTurnAgentOptions = {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    assistantOptions: GqlSChatAssistantOptions;
    surface: ChatSurface;
};

/**
 * Build a `ChatTurnFunction` for the given chat surface.
 * Admin uses the demo-capable admin factory; customer/cook use scaffolds until
 * their tool catalogs land.
 */
export function chatTurnAgentCreate({ serverRuntime, session, assistantOptions, surface }: ChatTurnAgentOptions): ChatTurnFunction {
    return async ({ assistantMessageId, messages }) => {
        const onStepEnd = async () => {};
        const agent =
            surface === 'admin'
                ? await agentAdminCreate({
                      serverRuntime,
                      assistantOptions,
                      session,
                      onStepEnd,
                  })
                : surface === 'cook'
                  ? await agentCookCreate({
                        serverRuntime,
                        session,
                        assistantOptions,
                        onStepEnd,
                    })
                  : await agentCustomerCreate({ serverRuntime, onStepEnd });

        const modelMessages = await chatMessageBodiesToModelMessages(messages);
        const result = await agent.stream({ messages: modelMessages });

        return {
            updates: chatMessageBodyUpdatesFromAiStream({
                initialMessage: chatMessageBodyEmpty({ id: assistantMessageId, role: 'assistant' }),
                stream: toUIMessageStream({
                    // Standalone helper defaults TOOLS to {}; agent streams are wider ToolSets.
                    stream: result.stream as ReadableStream<TextStreamPart<ToolSet>>,
                    generateMessageId: () => assistantMessageId,
                    sendSources: true,
                }),
            }),
            completion: Promise.all([result.finishReason, result.usage, result.finalStep]).then(([finishReason, usage, finalStep]) => ({
                agentName: agent.id ?? `assistant-${surface}`,
                modelId: finalStep.response.modelId,
                finishReason,
                usage: {
                    inputTokens: usage.inputTokens,
                    outputTokens: usage.outputTokens,
                    totalTokens: usage.totalTokens,
                    reasoningTokens: usage.outputTokenDetails.reasoningTokens,
                    cachedInputTokens: usage.inputTokenDetails.cacheReadTokens,
                },
            })),
        };
    };
}
