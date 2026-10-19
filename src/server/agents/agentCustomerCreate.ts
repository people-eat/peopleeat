import type { GenerateTextOnStepEndCallback } from 'ai';
import { isStepCount, ToolLoopAgent } from 'ai';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { aiTelemetry } from '../observability/aiTelemetry';
import { agentUserFacingWritingRules, currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';

interface AgentCustomerCreateOptions {
    serverRuntime: ServerRuntime;
    modelId?: string;
    onStepEnd: GenerateTextOnStepEndCallback<any>;
}

/** Customer-profile assistant. Scaffold only — no tools yet; wire from the profile rail. */
export async function agentCustomerCreate({ serverRuntime, modelId, onStepEnd }: AgentCustomerCreateOptions) {
    const resolvedModelId = modelId ?? 'gemini-2.5-flash';
    return new ToolLoopAgent({
        id: 'customer-assistant',
        model: serverRuntime.ai.customerAssistantModel(resolvedModelId),
        onStepEnd,
        telemetry: aiTelemetry('customer-assistant'),
        providerOptions: googleAgentProviderOptionsFor(resolvedModelId),
        stopWhen: [isStepCount(5)],
        instructions: [
            currentDateForAgent(),
            'You are the peopleeat assistant for customers booking a private chef. Be concise and practical. Tools are not wired yet; answer from general product knowledge only.',
            agentUserFacingWritingRules(),
        ].join('\n'),
        tools: {},
    });
}
