/** Serialize structured or string LLM output for `AiGenerations.output`. */
export function aiGenerationOutputSerialize(output: unknown): string {
    if (typeof output === 'string') return output;
    return JSON.stringify(output, null, 2);
}
