import type { AiGeneration } from '../db/schema';
import { AI_GENERATION_KINDS } from '../domain/aiGeneration';
import type { GqlSAdminAiGeneration, GqlSAdminAiGenerationKind } from '../graphql/generated';

const ADMIN_AI_GENERATION_KINDS = new Set<string>(AI_GENERATION_KINDS);

function toAdminAiGenerationKind(kind: string): GqlSAdminAiGenerationKind {
    if (!ADMIN_AI_GENERATION_KINDS.has(kind)) {
        throw new Error(`toGqlAdminAiGeneration: unexpected kind ${kind}`);
    }
    return kind as GqlSAdminAiGenerationKind;
}

export function toGqlAdminAiGeneration(row: AiGeneration): GqlSAdminAiGeneration {
    return {
        aiGenerationId: row.aiGenerationId,
        kind: toAdminAiGenerationKind(row.kind),
        userId: row.userId,
        sessionId: row.sessionId,
        modelId: row.modelId,
        system: row.system,
        prompt: row.prompt,
        output: row.output,
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        totalTokens: row.totalTokens,
        reasoningTokens: row.reasoningTokens,
        cachedInputTokens: row.cachedInputTokens,
        createdAt: row.createdAt,
    };
}
