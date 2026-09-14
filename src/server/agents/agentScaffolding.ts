import type { GoogleLanguageModelOptions } from '@ai-sdk/google';
import { z } from 'zod';
import type { PresentableItem } from './presentableItems';
import { parsePresentableItems } from './presentableItems';

export type { PresentableItem } from './presentableItems';

// Shared Gemini provider options for every chat agent in this directory.
// Two knobs matter independently:
//
// - `thinkingConfig` — three postures:
//   - **gemini-3.6-flash** (`thinkingLevel: 'high'` + `includeThoughts`):
//     high reasoning + thought summaries (streamed as `reasoning-delta`).
//   - **Other Flash** (`thinkingBudget: 0`): disables thinking. Without it,
//     Gemini 2.5 Flash periodically emits Python-style tool calls instead of
//     JSON (`MALFORMED_FUNCTION_CALL`). Substring match on `flash` keeps a
//     future `gemini-*-flash-lite` on this path.
//   - **Pro** (`includeThoughts: true`): Pro rejects `thinkingBudget: 0`
//     and keeps the provider default budget.
// - `structuredOutputs: true` — constrained decoding so tool calls are valid
//   JSON matching the declared schema.
export function googleAgentProviderOptionsFor(modelId: string): { google: GoogleLanguageModelOptions } {
    const google: GoogleLanguageModelOptions = { structuredOutputs: true };
    if (modelId === 'gemini-3.6-flash') {
        google.thinkingConfig = { thinkingLevel: 'high', includeThoughts: true };
    } else if (modelId.includes('flash')) {
        google.thinkingConfig = { thinkingBudget: 0 };
    } else {
        google.thinkingConfig = { includeThoughts: true };
    }
    return { google };
}

// Today's date in `YYYY-MM-DD`, rendered as the line every chat agent embeds
// near the top of its system prompt.
export function currentDateForAgent(): string {
    return `Today's date is ${new Date().toISOString().slice(0, 10)}.`;
}

/** Shared tone rules for every visitor-visible assistant reply. */
export function agentUserFacingWritingRules(): string {
    return 'Never use em dashes (—) in replies. Prefer commas, periods, colons, or parentheses.';
}

// Shared field copy for every `delegateTo*` `brief` input. Selection detail
// lives on each tool's `description`; this only teaches how to fill the brief.
export const DELEGATE_BRIEF_DESCRIBE =
    "User request plus any ids/dates already collected. Sub-agent has a live snapshot; don't summarize it.";

export type DelegateDetail = 'summary' | 'evidence';

// Shared field copy for every domain `delegateTo*` `detail` input. Web search
// does not take this flag (its result already carries per-brief `sources` /
// `items`). Selection of *when* to pick evidence vs summary lives here — not
// restated as a catalog on the orchestrator prompt.
const DELEGATE_DETAIL_DESCRIBE = [
    '`summary` (default): short narration for mutations and simple lookups.',
    "`evidence`: also attach the sub-agent's exact tool outputs so you can evaluate, quote, or compare the raw rows yourself",
    '(activity timelines, logs, lists, journal entries). Use evidence when the 1–2 sentence summary is not enough for your judgment.',
    'Not a substitute for re-delegating a write.',
].join(' ');

export function delegateDetailField() {
    return z.enum(['summary', 'evidence']).optional().describe(DELEGATE_DETAIL_DESCRIBE);
}

// Shared language / concision / id / sentinel rules for every domain mutation
// sub-agent. Domain-specific workflows stay in each agent file; this block is
// the wire contract with the orchestrator (see agent-delegation.md).
export function subAgentClosingRules(opts: { domainLabel: string; outOfDomainExample: string }): string[] {
    return [
        '- Reply in the language the user wrote in (German or English).',
        '- Be concise: your final text becomes the orchestrator narration. One or two sentences. Name ids of rows the user may want to open.',
        `- ${agentUserFacingWritingRules()}`,
        "- Never invent an id. Use ids from the snapshot or from a prior tool result's `referenceIds` (in input order).",
        '- When returning ≥2 browseable entities that the orchestrator may show as',
        '  CardList cards, end with EXACTLY this JSON as your final text (no fence, no prose around it):',
        '  {"status":"completed","summary":"<1-2 sentence narration>","items":[{"title":"...","description":"...","href":"...","imageUrl":"...","price":"..."}]}',
        '  Include `imageUrl` / `href` / `price` only when you have a real value from a tool result; never invent URLs.',
        '  Omit `items` (or reply in plain prose) for mutations / single-item / non-browse answers.',
        '- If required info is missing, return EXACTLY this JSON as your final text (no fence, no prose):',
        '  {"status":"needsMoreInfo","missingFields":["..."],"summary":"..."}',
        `- If outside ${opts.domainLabel} (e.g. '${opts.outOfDomainExample}'), return the same JSON with status \`noOp\` and empty \`missingFields\`.`,
    ];
}

// Sub-agent → orchestrator escape hatch. Emitted as the sub-agent's final
// text when the brief is underspecified (`needsMoreInfo`) or out of domain
// (`noOp`). Parsed by every `delegateTo*` tool — see agent-delegation.md.
export interface SubAgentSentinel {
    status: 'needsMoreInfo' | 'noOp';
    missingFields: string[];
    summary: string;
}

export interface SubAgentEvidenceItem {
    toolName: string;
    output: unknown;
}

/** Completed domain-delegate result; optional `items` feed orchestrator `cardList` blocks. */
interface SubAgentCompletedResult {
    status: 'completed';
    summary: string;
    items?: PresentableItem[];
    // Present only when the orchestrator called with `detail: 'evidence'`.
    // Capped last-N tool outputs from the sub-agent run so the smart model
    // can judge the exact rows (see attachDelegateEvidence).
    evidence?: SubAgentEvidenceItem[];
    evidenceTruncated?: boolean;
}

export type SubAgentDelegateResult = SubAgentCompletedResult | SubAgentSentinel;

function jsonCandidatesFromText(text: string): string[] {
    const trimmed = text.trim();
    if (!trimmed) return [];
    const candidates: string[] = [];
    if (trimmed.startsWith('{')) candidates.push(trimmed);
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch?.[1]) candidates.push(fenceMatch[1].trim());
    const embeddedStart = trimmed.indexOf('{');
    if (embeddedStart > 0) {
        const embedded = extractBalancedJsonObject(trimmed, embeddedStart);
        if (embedded) candidates.push(embedded);
    }
    return candidates;
}

/** Return the substring of a balanced `{…}` object starting at `start`, or null. */
function extractBalancedJsonObject(text: string, start: number): string | null {
    if (text[start] !== '{') return null;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
            if (escape) {
                escape = false;
                continue;
            }
            if (ch === '\\') {
                escape = true;
                continue;
            }
            if (ch === '"') inString = false;
            continue;
        }
        if (ch === '"') {
            inString = true;
            continue;
        }
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) return text.slice(start, i + 1);
        }
    }
    return null;
}

export function tryParseSubAgentSentinel(text: string): SubAgentSentinel | null {
    for (const candidate of jsonCandidatesFromText(text)) {
        if (!candidate.startsWith('{')) continue;
        try {
            const parsed = JSON.parse(candidate);
            if (parsed && typeof parsed === 'object' && (parsed.status === 'needsMoreInfo' || parsed.status === 'noOp')) {
                const missingFields = Array.isArray(parsed.missingFields)
                    ? parsed.missingFields.filter((field: unknown): field is string => typeof field === 'string')
                    : [];
                const summary = typeof parsed.summary === 'string' ? parsed.summary : '';
                return { status: parsed.status, missingFields, summary };
            }
        } catch {
            // not JSON — keep looking
        }
    }
    return null;
}

/**
 * Parse a domain sub-agent's final text into the orchestrator tool-result shape.
 * - Sentinel JSON → needsMoreInfo / noOp
 * - `{"status":"completed","summary":"…","items":[…]}` → completed (+ optional items)
 * - Plain prose → completed with the full text as summary
 */
export function parseSubAgentFinalText(text: string): SubAgentDelegateResult {
    const sentinel = tryParseSubAgentSentinel(text);
    if (sentinel) return sentinel;

    for (const candidate of jsonCandidatesFromText(text)) {
        if (!candidate.startsWith('{')) continue;
        try {
            const parsed: unknown = JSON.parse(candidate);
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) continue;
            const record = parsed as Record<string, unknown>;
            if (record.status !== 'completed') continue;
            const summary = typeof record.summary === 'string' ? record.summary : '';
            const items = parsePresentableItems(record.items);
            return items && items.length > 0 ? { status: 'completed', summary, items } : { status: 'completed', summary };
        } catch {
            // not JSON — keep looking
        }
    }

    return { status: 'completed', summary: text.trim() };
}

/**
 * Web-search sub-agent final text: same completed JSON + items convention,
 * otherwise the whole reply is the summary.
 */
export function parseWebSearchFinalText(text: string): { summary: string; items?: PresentableItem[] } {
    const parsed = parseSubAgentFinalText(text);
    if (parsed.status === 'completed') {
        return parsed.items && parsed.items.length > 0 ? { summary: parsed.summary, items: parsed.items } : { summary: parsed.summary };
    }
    // Web search never emits sentinels; if one slips through, treat as prose.
    return { summary: text.trim() };
}

// Cap on how many nested tool outputs ride back on `detail: evidence`.
// The sub-agent step budget is 10; 12 leaves a little headroom without
// dumping an unbounded log into the orchestrator's next step.
const SUB_AGENT_EVIDENCE_MAX_ITEMS = 12;
// ~8–10k tokens of JSON. Large enough for a projectGet / food-log page;
// small enough that Pro doesn't eat a 50k-row dump in one tool result.
const SUB_AGENT_EVIDENCE_MAX_CHARS = 32_000;

export interface SubAgentGenerateStep {
    toolCalls?: ReadonlyArray<{ toolCallId: string; toolName: string }>;
    toolResults?: ReadonlyArray<{ toolCallId: string; output: unknown }>;
    content?: ReadonlyArray<{ type?: string; toolCallId?: string; error?: unknown }>;
}

function jsonSafe(value: unknown): unknown {
    try {
        return JSON.parse(JSON.stringify(value)) as unknown;
    } catch {
        return String(value);
    }
}

function jsonLength(value: unknown): number {
    try {
        return JSON.stringify(value).length;
    } catch {
        return String(value).length;
    }
}

function outputFromStep(step: SubAgentGenerateStep, toolCallId: string): unknown | undefined {
    const matching = step.toolResults?.find((result) => result.toolCallId === toolCallId);
    if (matching) return matching.output;
    for (const part of step.content ?? []) {
        if (part.type !== 'tool-error' || part.toolCallId !== toolCallId) continue;
        return { status: 'failed', summary: summarizeDelegateError(part.error) };
    }
    return undefined;
}

/**
 * Collect last-N tool outputs from a sub-agent `generate` result, dropping
 * oldest items (then preview-truncating a single oversized leftover) until
 * the serialized payload is under `maxChars`.
 */
export function collectSubAgentEvidence(
    steps: ReadonlyArray<SubAgentGenerateStep> | null | undefined,
    opts?: { maxItems?: number; maxChars?: number },
): { evidence: SubAgentEvidenceItem[]; truncated: boolean } {
    const maxItems = opts?.maxItems ?? SUB_AGENT_EVIDENCE_MAX_ITEMS;
    const maxChars = opts?.maxChars ?? SUB_AGENT_EVIDENCE_MAX_CHARS;
    const collected: SubAgentEvidenceItem[] = [];
    for (const step of steps ?? []) {
        for (const call of step.toolCalls ?? []) {
            const output = outputFromStep(step, call.toolCallId);
            if (output === undefined) continue;
            collected.push({ toolName: call.toolName, output: jsonSafe(output) });
        }
    }
    let truncated = collected.length > maxItems;
    const evidence = collected.slice(-maxItems);
    while (evidence.length > 1 && jsonLength(evidence) > maxChars) {
        evidence.shift();
        truncated = true;
    }
    if (evidence.length === 1 && jsonLength(evidence) > maxChars) {
        const only = evidence[0]!;
        const raw = (() => {
            try {
                return JSON.stringify(only.output);
            } catch {
                return String(only.output);
            }
        })();
        evidence[0] = {
            toolName: only.toolName,
            output: { truncated: true, preview: raw.slice(0, Math.max(64, maxChars - 80)) },
        };
        truncated = true;
    }
    return { evidence, truncated };
}

/**
 * When the orchestrator asked for `detail: 'evidence'`, attach capped tool
 * outputs onto a completed delegate result. Sentinels (`needsMoreInfo` /
 * `noOp`) stay summary-only — missing fields, not raw rows, are the contract.
 */
export function attachDelegateEvidence(
    parsed: SubAgentDelegateResult,
    generateResult: { steps?: ReadonlyArray<SubAgentGenerateStep> | null },
    detail: DelegateDetail | undefined,
): SubAgentDelegateResult {
    if (detail !== 'evidence' || parsed.status !== 'completed') return parsed;
    const { evidence, truncated } = collectSubAgentEvidence(generateResult.steps);
    if (evidence.length === 0) return parsed;
    return truncated ? { ...parsed, evidence, evidenceTruncated: true } : { ...parsed, evidence };
}

// Best-effort one-line summary for the orchestrator + transcript when a
// delegate's `agent.generate` throws. Strips stack noise so the rendered
// tool-result card stays readable; the full error already lands in
// `serverRuntime.log` via the catch at the call site.
export function summarizeDelegateError(error: unknown): string {
    if (error instanceof Error) {
        const message = error.message.trim();
        if (message) return message.split('\n')[0]?.slice(0, 500) ?? 'unknown error';
    }
    if (typeof error === 'string' && error.trim()) return error.trim().slice(0, 500);
    return 'unknown error';
}
