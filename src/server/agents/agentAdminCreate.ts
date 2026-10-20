import type { GenerateTextOnStepEndCallback } from 'ai';
import { hasToolCall, isStepCount, ToolLoopAgent } from 'ai';
import type { GqlCChatAssistantOptions } from '../../web/graphql/generated';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';
import { aiTelemetry } from '../observability/aiTelemetry';
import { toolAdminBookingRequestsFindMany } from '../queries/adminBookingRequestFindMany';
import { toolAdminCookMealsFindMany } from '../queries/adminCookMealFindMany';
import { toolAdminCookMenusFindMany } from '../queries/adminCookMenuFindMany';
import { toolAdminUsersFindMany } from '../queries/adminUserFindMany';
import { agentUserFacingWritingRules, currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';
import { toolPromptUserForInput } from './toolPromptUserForInput';

interface AgentAdminCreateOptions {
    serverRuntime: ServerRuntime;
    assistantOptions: GqlCChatAssistantOptions;
    session: GqlSSession;
    modelId?: string;
    onStepEnd: GenerateTextOnStepEndCallback<any>;
}

/**
 * Admin personal assistant. Booking-request / user / meal / menu list tools
 * plus promptUserForInput for clarifying filters.
 *
 * Gemini cannot combine `Output.object` (JSON mime type) with function calling,
 * so final answers are plain markdown while tools remain available. Rich list
 * cards are persisted as admin `*.List` data parts from tool output (see
 * `chatMessageAiAdapter`).
 */
export async function agentAdminCreate({ serverRuntime, session, modelId, onStepEnd }: AgentAdminCreateOptions) {
    const resolvedModelId = modelId ?? 'gemini-2.5-flash';
    return new ToolLoopAgent({
        id: 'admin-assistant',
        model: serverRuntime.ai.adminAssistantModel(resolvedModelId),
        onStepEnd,
        telemetry: aiTelemetry('admin-assistant'),
        providerOptions: googleAgentProviderOptionsFor(resolvedModelId),
        stopWhen: [isStepCount(5), hasToolCall('promptUserForInput')],
        instructions: [
            currentDateForAgent(),
            'You are the peopleeat admin assistant. Help operators with users, support, content, and marketplace ops. Be concise and practical.',
            'When the operator asks to show, list, or find booking requests (especially by recency like “past 7 days”), call adminBookingRequestsFindMany.',
            'When the operator asks to show, list, or find users / customers / cooks / admins, call adminUsersFindMany.',
            'When the operator asks to show, list, or find meals or dishes, call adminCookMealsFindMany.',
            'When the operator asks to show, list, or find menus, call adminCookMenusFindMany.',
            'Prefer the `days` argument for relative booking-request windows. After a list tool returns, reply with a short markdown summary of the count; the UI renders the cards from the tool result. Do not invent ids or details.',
            'List tools default to detail=summary (count + ids for you; cards stay in the UI). Pass detail=evidence when the operator’s question needs fields from the rows.',
            'For follow-up drill-in on a specific row from a prior list result, call the same list tool again with that entity’s id array (bookingRequestIds / userIds / mealIds / menuIds), typically length 1. When you need row fields, also pass detail=evidence.',
            'If a required filter (time window, search target) is unclear, ask with promptUserForInput before searching.',
            'Reply in clear markdown. Prefer short paragraphs and lists over walls of text.',
            agentUserFacingWritingRules(),
        ].join('\n'),
        tools: {
            promptUserForInput: toolPromptUserForInput(),
            adminBookingRequestsFindMany: toolAdminBookingRequestsFindMany({
                requestingSession: session,
                serverRuntime,
            }),
            adminUsersFindMany: toolAdminUsersFindMany({
                requestingSession: session,
                serverRuntime,
            }),
            adminCookMealsFindMany: toolAdminCookMealsFindMany({
                requestingSession: session,
                serverRuntime,
            }),
            adminCookMenusFindMany: toolAdminCookMenusFindMany({
                requestingSession: session,
                serverRuntime,
            }),
        },
    });
}
