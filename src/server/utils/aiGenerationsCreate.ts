import { idCreate } from '../../shared/idCreate';
import type { Database } from '../db';
import { aiGenerations } from '../db/schema';
import type { AiGenerationKind } from '../domain/aiGeneration';

type AiGenerationRecordInput = {
    kind: AiGenerationKind;
    userId?: string | null;
    sessionId?: string | null;
    modelId?: string | null;
    system: string;
    prompt: string;
    output: string;
    inputTokens?: number | null;
    outputTokens?: number | null;
    totalTokens?: number | null;
    reasoningTokens?: number | null;
    cachedInputTokens?: number | null;
};

export interface AiGenerationsRecorder {
    record: (input: AiGenerationRecordInput) => void;
    drain: () => Promise<void>;
}

/** Fire-and-forget persistence for one-shot LLM calls. Insert failures fall
 * back to `console.error` and never fail the caller — same stance as
 * `loggerCreate`. See `docs/architecture/ai-generations.md`. */
export function aiGenerationsCreate(db: Database): AiGenerationsRecorder {
    const pending: Promise<unknown>[] = [];

    function record(input: AiGenerationRecordInput) {
        const promise = db
            .insert(aiGenerations)
            .values({
                aiGenerationId: idCreate(),
                kind: input.kind,
                userId: input.userId ?? null,
                sessionId: input.sessionId ?? null,
                modelId: input.modelId ?? null,
                system: input.system,
                prompt: input.prompt,
                output: input.output,
                inputTokens: input.inputTokens ?? null,
                outputTokens: input.outputTokens ?? null,
                totalTokens: input.totalTokens ?? null,
                reasoningTokens: input.reasoningTokens ?? null,
                cachedInputTokens: input.cachedInputTokens ?? null,
            })
            .catch(console.error);
        pending.push(promise);
    }

    return {
        record,
        async drain() {
            await Promise.allSettled(pending);
            pending.length = 0;
        },
    };
}
