import { tool } from 'ai';
import { z } from 'zod';

// --- toolPromptUserForInput --------------------------------------------------
//
// Lets an assistant prompt the user for one or more structured values in a
// single chat turn. The slot kinds mirror the `ChatAssistantInput` GraphQL
// union members (`Date`, `DateTime`, ..., `Boolean`, `Text`).
//
// The top-level `mode` field controls rendering only — `form` shows every slot
// at once, `stepThrough` walks the user through one slot at a time. The
// submitted answer set is identical between modes; the wizard accumulates
// drafts client-side and submits the same batch the form does.
//
// `form` is capped at `FORM_MODE_MAX_SLOTS` slots. Longer collections are
// coerced to `stepThrough` at parse time so a model that ignores the schema
// description cannot dump a wall of fields on the user.
//
// Select `options` are user-facing labels — natural language only. The LLM
// maps answered labels back to tool-arg enums itself (see architecture/chat.md
// "Label-only select options"). CamelCase identifiers that slip through are
// humanized before persistence so the UI never shows raw keys.
//
// No `execute`: the tool call itself — with its structured input — is what
// gets persisted. The turn runner recognizes the tool name and keeps the call
// in `input-available` so the UI can render the form. Agent factories stop on
// this tool call (`hasToolCall('promptUserForInput')`) because the next
// turn-taker is the human, not the LLM.
//
// Schema shape: a flat object per slot with a `kind` enum, NOT a Zod
// `discriminatedUnion`. Discriminated unions compile to JSON Schema `oneOf`,
// which Gemini's tool-call schema renderer handles poorly — when faced with
// it, the model tends to invent its own field names (e.g. `input_type: DATE`
// with `name`/`label`) and ignore the schema entirely. A flat enum + optional
// `options` is the Gemini-friendly form; conditional shape (options required
// only for selects) is enforced at validation time, not in the wire schema.
//
// Reused across agents — keep agent-specific behavior out of here.

const SLOT_KINDS = ['Date', 'DateRange', 'DateTime', 'Time', 'SingleSelect', 'MultiSelect', 'Boolean', 'Text'] as const;

const COLLECTION_MODES = ['form', 'stepThrough'] as const;

/** Max slots allowed in `form` mode. Longer collections always render as `stepThrough`. */
export const FORM_MODE_MAX_SLOTS = 4;

const inputSlotSchema = z
    .object({
        kind: z
            .enum(SLOT_KINDS)
            .describe(
                [
                    'Type of value to collect. Must be one of:',
                    '`Date` (single calendar day),',
                    '`DateRange` (calendar range with required start and end days),',
                    '`DateTime` (single instant),',
                    '`Time` (clock time, no date),',
                    '`SingleSelect` (pick exactly one of `options`),',
                    '`MultiSelect` (pick zero or more of `options`),',
                    '`Boolean` (yes/no answer, rendered as a Yes/No button pair),',
                    '`Text` (free-form string).',
                ].join(' '),
            ),
        prompt: z.string().describe('Label shown next to this specific input slot.'),
        options: z
            .array(z.string())
            .optional()
            .describe(
                [
                    'User-facing choice labels for `SingleSelect` / `MultiSelect`.',
                    'Natural language only (e.g. "Web app", "Mobile app", "AI integration") — never camelCase keys,',
                    'enum values, or identifiers. Required for those kinds; omit otherwise.',
                ].join(' '),
            ),
    })
    .describe('A single typed slot the user is asked to fill.');

export const chatAssistantInputCollectionInputSchema = z
    .object({
        prompt: z.string().describe('Framing shown above the form. Sets context for all slots; do not duplicate per-slot prompts here.'),
        inputs: z.array(inputSlotSchema).min(1).describe('1..N typed input slots, rendered top-to-bottom.'),
        mode: z
            .enum(COLLECTION_MODES)
            .default('form')
            .describe(
                [
                    '`form` = all slots at once (default, only when there are ≤4 slots);',
                    '`stepThrough` = one-at-a-time. Required when there are more than 4 slots — never use `form` for longer collections.',
                ].join(' '),
            ),
    })
    .transform((data) => ({
        ...data,
        mode: data.inputs.length > FORM_MODE_MAX_SLOTS ? ('stepThrough' as const) : data.mode,
        inputs: data.inputs.map((slot) => (slot.options ? { ...slot, options: slot.options.map(selectOptionToNaturalLanguage) } : slot)),
    }));

export function toolPromptUserForInput() {
    return tool({
        description: [
            'Ask the user for one or more structured values in a single chat turn.',
            'Use this instead of asking for values in prose whenever the values have a known shape',
            '(dates, time ranges, picking from a list, yes/no, free text, ...).',
            'Group related questions into one call — do not call this tool multiple times in a row',
            'when the questions could be answered together.',
            'Each slot MUST set `kind` to one of the allowed enum values; never invent fields like `name`,',
            '`label`, or `input_type`.',
            'Use `mode: "form"` only for ≤4 slots; longer collections must use `stepThrough`.',
            'Select options must be natural-language labels the user reads (never camelCase keys).',
            'The tool result has the shape `{ status: "answered" | "skipped", answers: [...] }`.',
            'On `status: "skipped"`, the user declined to answer (e.g. they typed a free-text message',
            'instead of filling the form) — drop the question and respond to whatever the user said next.',
            'Do NOT immediately re-ask the same question; either rephrase, ask something different, or',
            'proceed without the missing information.',
        ].join(' '),
        inputSchema: chatAssistantInputCollectionInputSchema,
    });
}

/**
 * Turns camelCase / PascalCase identifiers into spaced labels so a model that
 * leaks enum keys (`webApp`, `aiIntegration`) never reaches the UI as-is.
 * Already-natural strings (spaces, punctuation, plain words) pass through.
 */
export function selectOptionToNaturalLanguage(option: string): string {
    const trimmed = option.trim();
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(trimmed) || !/[a-z]/.test(trimmed) || !/[A-Z]/.test(trimmed)) {
        return trimmed;
    }
    return trimmed.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (char) => char.toUpperCase());
}
