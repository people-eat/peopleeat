import type { GenerateTextOnStepEndCallback } from 'ai';
import { hasToolCall, isStepCount, ToolLoopAgent } from 'ai';

import type { GqlCChatAssistantOptions } from '../../web/graphql/generated';
import { toolCookMealCreate } from '../commands/cookMealCreate';
import { toolCookUpdate } from '../commands/cookUpdate';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { cookAssistantStateSnapshotFormat, cookAssistantStateSnapshotRead } from '../queries/cookAssistantStateSnapshotRead';
import { agentUserFacingWritingRules, currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';
import { toolPromptUserForInput } from './toolPromptUserForInput';

interface AgentCookCreateOptions {
    serverRuntime: ServerRuntime;
    session: GqlSSession;
    assistantOptions: GqlCChatAssistantOptions;
    modelId?: string;
    onStepEnd: GenerateTextOnStepEndCallback<any>;
}

/**
 * Cook-profile assistant. Tools mutate the signed-in cook via the same
 * commands as GraphQL (`toolCookMealCreate`, `toolCookUpdate`). A cook state
 * snapshot is inlined in the system prompt each turn.
 *
 * Gemini cannot combine `Output.object` (JSON mime type) with function calling,
 * so final answers are plain markdown while tools remain available.
 */
export async function agentCookCreate({ serverRuntime, session, assistantOptions, modelId, onStepEnd }: AgentCookCreateOptions) {
    const cookId = session.userId;
    if (!cookId) {
        throw new Error('agentCookCreate requires a signed-in user');
    }

    const snapshot = await cookAssistantStateSnapshotRead(serverRuntime, cookId);
    if (!snapshot) {
        throw new Error('agentCookCreate: cook profile not found');
    }

    const resolvedModelId = modelId ?? 'gemini-2.5-flash';
    const toolApproval = assistantOptions.requireToolCallApprovals
        ? {
              cookMealCreate: 'user-approval' as const,
              cookUpdate: 'user-approval' as const,
          }
        : undefined;

    return new ToolLoopAgent({
        id: 'cook-assistant',
        model: serverRuntime.ai.cookAssistantModel(resolvedModelId),
        onStepEnd,
        providerOptions: googleAgentProviderOptionsFor(resolvedModelId),
        stopWhen: [isStepCount(8), hasToolCall('promptUserForInput')],
        instructions: [
            currentDateForAgent(),
            'You are the peopleeat assistant for the signed-in private chef.',
            'Help with their profile, meals, menus, offers, and booking-request pool work.',
            'Be concise and practical. Prefer tools over guessing; update only fields the cook asked to change.',
            'When you need structured details (cuisine, travel radius, meal title), call promptUserForInput instead of freeform parsing.',
            'Reply in clear markdown. Prefer short paragraphs and lists over walls of text.',
            agentUserFacingWritingRules(),
            cookAssistantStateSnapshotFormat(snapshot),
        ].join('\n\n'),
        toolApproval,
        tools: {
            promptUserForInput: toolPromptUserForInput(),
            cookMealCreate: toolCookMealCreate({
                cookId,
                requestingSession: session,
                serverRuntime,
            }),
            cookUpdate: toolCookUpdate({
                cookId,
                requestingSession: session,
                serverRuntime,
            }),
        },
    });
}
