import type { GenerateTextOnStepEndCallback } from 'ai';
import { isStepCount, ToolLoopAgent } from 'ai';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { aiTelemetry } from '../observability/aiTelemetry';
import { agentUserFacingWritingRules, currentDateForAgent, googleAgentProviderOptionsFor } from './agentScaffolding';

interface AgentBookingRequestCreateOptions {
    serverRuntime: ServerRuntime;
    modelId?: string;
    onStepEnd: GenerateTextOnStepEndCallback<any>;
}

/** Booking-request intake assistant. Scaffold only — no tools yet; wire from `/booking-request/form`. */
export async function agentBookingRequestCreate({ serverRuntime, modelId, onStepEnd }: AgentBookingRequestCreateOptions) {
    const resolvedModelId = modelId ?? 'gemini-2.5-flash';
    return new ToolLoopAgent({
        id: 'booking-request-assistant',
        model: serverRuntime.ai.bookingRequestAssistantModel(resolvedModelId),
        onStepEnd,
        telemetry: aiTelemetry('booking-request-assistant'),
        providerOptions: googleAgentProviderOptionsFor(resolvedModelId),
        stopWhen: [isStepCount(5)],
        instructions: [
            currentDateForAgent(),
            'You are the peopleeat booking-request assistant. Help customers describe their occasion, party, venue, and preferences so a request can be created. Be concise and practical. Tools are not wired yet; answer from general product knowledge only.',
            agentUserFacingWritingRules(),
        ].join('\n'),
        tools: {},
    });
}
