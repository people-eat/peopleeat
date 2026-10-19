import { propagateAttributes } from '@langfuse/tracing';

import type { EnvironmentVariables } from '../env/EnvironmentVariables';
import { environmentVariables } from '../env/environmentVariablesCreate';

export type AiTelemetryOptions = {
    isEnabled?: boolean;
    functionId: string;
};

function aiTelemetryEnabled(environmentVariablesValue: EnvironmentVariables = environmentVariables): boolean {
    return environmentVariablesValue.langfuseTransport === 'cloud' || environmentVariablesValue.otelTransport === 'otlp';
}

/** AI SDK `telemetry` block. Disabled when both Langfuse and OTLP transports are off. */
export function aiTelemetry(
    functionId: string,
    environmentVariablesValue: EnvironmentVariables = environmentVariables,
): AiTelemetryOptions {
    return {
        isEnabled: aiTelemetryEnabled(environmentVariablesValue),
        functionId,
    };
}

export type AiTraceAttributes = {
    traceName: string;
    userId?: string;
    sessionId?: string;
    tags?: string[];
    metadata?: Record<string, string>;
};

/**
 * Propagate Langfuse / OTel attributes around an AI call. No-ops the attribute
 * layer when AI telemetry is disabled (still runs `fn`).
 */
export async function withAiTraceAttributes<T>(
    attributes: AiTraceAttributes,
    fn: () => Promise<T>,
    environmentVariablesValue: EnvironmentVariables = environmentVariables,
): Promise<T> {
    if (!aiTelemetryEnabled(environmentVariablesValue)) {
        return fn();
    }

    return propagateAttributes(
        {
            traceName: attributes.traceName,
            userId: attributes.userId,
            sessionId: attributes.sessionId,
            tags: attributes.tags,
            metadata: attributes.metadata,
            environment: environmentVariablesValue.observabilityEnvironment,
        },
        fn,
    );
}
