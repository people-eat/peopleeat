import { z } from 'zod';

export type AdminListDetail = 'summary' | 'evidence';

const ADMIN_LIST_CARD_KEYS = ['requests', 'users', 'meals', 'menus'] as const;

const ADMIN_LIST_DETAIL_DESCRIBE = [
    '`summary` (default): return count and ids for the model; the UI still shows list cards.',
    '`evidence`: also include the full card-shaped rows so you can compare, quote, or answer from row fields.',
    'Use evidence when a short count/id list is not enough. Prefer summary for show/list.',
].join(' ');

export function adminListDetailField() {
    return z.enum(['summary', 'evidence']).optional().describe(ADMIN_LIST_DETAIL_DESCRIBE);
}

export function resolveAdminListDetail(detail: AdminListDetail | undefined): AdminListDetail {
    return detail ?? 'summary';
}

/** Resolve detail from a tool part's input (and optional output.detail fallback). */
export function adminListDetailFromToolPart(part: { input?: unknown; output?: unknown }): AdminListDetail {
    const fromRecord = (value: unknown): AdminListDetail | undefined => {
        if (value == null || typeof value !== 'object' || Array.isArray(value)) return undefined;
        const detail = (value as Record<string, unknown>).detail;
        return detail === 'summary' || detail === 'evidence' ? detail : undefined;
    };
    return resolveAdminListDetail(fromRecord(part.input) ?? fromRecord(part.output));
}

/**
 * Shape admin list tool output for the model / persisted tool part.
 * `summary` omits card arrays; `evidence` keeps the full execute payload.
 */
export function adminListToolOutputForModel(output: unknown, detail: AdminListDetail | undefined): unknown {
    const resolved = resolveAdminListDetail(detail);
    if (resolved === 'evidence' || output == null || typeof output !== 'object' || Array.isArray(output)) {
        return output;
    }
    const lean: Record<string, unknown> = { ...(output as Record<string, unknown>), detail: resolved };
    for (const key of ADMIN_LIST_CARD_KEYS) {
        delete lean[key];
    }
    return lean;
}

export function adminListToolOutputToModelResult(output: unknown, detail: AdminListDetail | undefined) {
    return {
        type: 'json' as const,
        value: adminListToolOutputForModel(output, detail) as never,
    };
}
