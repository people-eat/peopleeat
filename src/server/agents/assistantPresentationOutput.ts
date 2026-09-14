import { z } from 'zod';
import type { ChatAssistantBodyBlock, ChatAssistantBodyPayload } from '../db/chatPayloadTypes';

// Structured presentation schema for agents that do **not** also call tools.
// Gemini rejects `Output.object` (responseMimeType application/json) together
// with function calling — tool-loop assistants therefore reply in markdown and
// keep this schema for tool-free / post-hoc presentation paths only.

const BLOCK_KINDS = ['markdown', 'cardList'] as const;

const cardItemSchema = z.object({
    imageUrl: z.string().optional().describe('Optional absolute https image URL from a sub-agent `items[].imageUrl`. Never invent.'),
    title: z.string().describe('Card headline (product name, listing title, …).'),
    description: z.string().describe('Short supporting copy. Put the price in `price`, not here.'),
    price: z.string().optional().describe('Optional display price as shown to the user (e.g. "€24.99").'),
    href: z
        .string()
        .optional()
        .describe(
            'Absolute https product/listing URL. When mapping from delegate/web-search `items`, copy `items[].href` 1:1 whenever it is present. Omit only when that item has no href; never invent a URL.',
        ),
    buttonTitle: z.string().optional().describe('Short CTA when `href` is set (e.g. "View product", "Open listing").'),
});

const blockSchema = z.object({
    kind: z.enum(BLOCK_KINDS).describe('`markdown` = prose; `cardList` = browseable cards.'),
    text: z.string().optional().describe('Markdown body. Required when kind=markdown.'),
    cards: z
        .array(cardItemSchema)
        .optional()
        .describe(
            'Cards for kind=cardList (at least one complete card). Map from `items` 1:1; always copy `href` / `imageUrl` / `price` when the item has them.',
        ),
});

/** Zod schema for `Output.object`. */
const assistantPresentationOutputSchema = z
    .object({
        blocks: z
            .array(blockSchema)
            .min(1)
            .describe(
                'Ordered reply segments. Mix markdown + cardList freely (e.g. framing → cards → follow-up). Prefer cardList for ≥2 browseable entities; map delegate `items` 1:1 including href/imageUrl/price when present. Never invent URLs.',
            ),
    })
    .describe('Final assistant answer as an ordered list of content blocks.');

type AssistantPresentationOutput = z.infer<typeof assistantPresentationOutputSchema>;
export type AssistantPresentationPartial = {
    blocks?: Array<Partial<z.infer<typeof blockSchema>> | null> | null;
};

function optionalNonEmpty(value: string | undefined): string | undefined {
    return value != null && value.length > 0 ? value : undefined;
}

function normalizeCard(c: z.infer<typeof cardItemSchema>) {
    return {
        title: c.title,
        description: c.description,
        ...(optionalNonEmpty(c.price) ? { price: c.price } : {}),
        ...(optionalNonEmpty(c.href) ? { href: c.href } : {}),
        ...(optionalNonEmpty(c.buttonTitle) ? { buttonTitle: c.buttonTitle } : {}),
        ...(optionalNonEmpty(c.imageUrl) ? { imageUrl: c.imageUrl } : {}),
    };
}

/** Narrow a partial/complete structured output into persistable body blocks. */
export function assistantPresentationNormalize(
    partial: AssistantPresentationPartial | AssistantPresentationOutput | null | undefined,
): ChatAssistantBodyPayload | null {
    if (partial == null || !Array.isArray(partial.blocks) || partial.blocks.length === 0) return null;
    const blocks: ChatAssistantBodyBlock[] = [];
    for (const raw of partial.blocks) {
        if (raw == null || typeof raw !== 'object') continue;
        const kind = raw.kind;
        if (kind === 'markdown') {
            if (typeof raw.text === 'string' && raw.text.length > 0) {
                blocks.push({ kind: 'markdown', text: raw.text });
            }
            continue;
        }
        if (kind === 'cardList') {
            if (!Array.isArray(raw.cards) || raw.cards.length === 0) continue;
            const cards = raw.cards
                .filter(
                    (c): c is z.infer<typeof cardItemSchema> =>
                        typeof c.title === 'string' && c.title.length > 0 && typeof c.description === 'string',
                )
                .map(normalizeCard);
            if (cards.length > 0) blocks.push({ kind: 'cardList', cards });
        }
    }
    return blocks.length > 0 ? { blocks } : null;
}

/**
 * True when streamed assistant text looks like structured `Output.object`
 * JSON (so we can suppress it from the live markdown buffer).
 */
export function chatAssistantTextLooksLikeStructuredOutput(text: string): boolean {
    const trimmed = text.trimStart();
    if (!trimmed.startsWith('{')) return false;
    if (/"blocks"\s*:/.test(trimmed)) return true;
    if (/"cardItems"\s*:/.test(trimmed) || /"markdownResponse"\s*:/.test(trimmed)) {
        return true;
    }
    return trimmed.length <= 24 && /^\{[\s"]*[a-zA-Z"]*$/.test(trimmed);
}
