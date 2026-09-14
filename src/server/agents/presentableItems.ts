// Card-ready fields that sub-agents / web-search may attach to a completed
// delegate result so the orchestrator can fill `cardList` body blocks without
// inventing URLs. Field names match CardList cards 1:1.
// See `docs/architecture/agent-delegation.md` and `docs/architecture/chat.md`.

export interface PresentableItem {
    title: string;
    description?: string;
    href?: string;
    imageUrl?: string;
    price?: string;
}

function optionalNonEmptyString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

/** Narrow unknown JSON into `PresentableItem[]`. Drops malformed entries. */
export function parsePresentableItems(raw: unknown): PresentableItem[] | undefined {
    if (!Array.isArray(raw) || raw.length === 0) return undefined;
    const items: PresentableItem[] = [];
    for (const entry of raw) {
        if (!entry || typeof entry !== 'object') continue;
        const record = entry as Record<string, unknown>;
        const title = optionalNonEmptyString(record.title);
        if (!title) continue;
        const item: PresentableItem = { title };
        const description = optionalNonEmptyString(record.description);
        const href = optionalNonEmptyString(record.href);
        const imageUrl = optionalNonEmptyString(record.imageUrl);
        const price = optionalNonEmptyString(record.price);
        if (description) item.description = description;
        if (href) item.href = href;
        if (imageUrl) item.imageUrl = imageUrl;
        if (price) item.price = price;
        items.push(item);
    }
    return items.length > 0 ? items : undefined;
}
