import type { LanguageModelUsage } from 'ai';

/** Token + model snapshot shared by chat message variants and one-shot
 * `AiGenerations` rows. Same normalization rules as chat
 * (`totalTokens` fallback; nullable reasoning / cached). */
export type AiGenerationUsageSnapshot = {
    modelId: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    reasoningTokens: number | null;
    cachedInputTokens: number | null;
};

export function aiGenerationUsageFromLanguageModel(
    modelId: string | undefined | null,
    usage: LanguageModelUsage,
): AiGenerationUsageSnapshot {
    const { inputTokens, outputTokens, totalTokens, inputTokenDetails, outputTokenDetails } = usage;
    const reasoningTokens = outputTokenDetails.reasoningTokens;
    const cachedInputTokens = inputTokenDetails.cacheReadTokens;
    const totalFallback = totalTokens ?? (inputTokens != null && outputTokens != null ? inputTokens + outputTokens : null);
    return {
        modelId: modelId ?? null,
        inputTokens: inputTokens ?? null,
        outputTokens: outputTokens ?? null,
        totalTokens: totalFallback,
        reasoningTokens: reasoningTokens ?? null,
        cachedInputTokens: cachedInputTokens ?? null,
    };
}
