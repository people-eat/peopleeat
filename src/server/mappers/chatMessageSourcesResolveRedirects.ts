import type { ChatMessageSource } from '../db/chatPayloadTypes';

// Gemini Google Search grounding often returns Vertex AI Search redirect URIs
// (`vertexaisearch.cloud.google.com/grounding-api-redirect/…`) instead of the
// destination page. Following those redirects (when possible) gives the
// Sources footer real product/article URLs. Failures keep the redirect URL —
// never invent a destination.

const GROUNDING_REDIRECT_HOSTS = new Set(['vertexaisearch.cloud.google.com']);

const DEFAULT_TIMEOUT_MS = 2500;

export function isGroundingRedirectUrl(url: string): boolean {
    try {
        return GROUNDING_REDIRECT_HOSTS.has(new URL(url).hostname.toLowerCase());
    } catch {
        return false;
    }
}

function isResolvedDestination(original: string, finalUrl: string): boolean {
    return finalUrl.length > 0 && finalUrl !== original && !isGroundingRedirectUrl(finalUrl);
}

async function fetchFinalUrl(url: string, method: 'HEAD' | 'GET', signal: AbortSignal): Promise<string | null> {
    const response = await fetch(url, {
        method,
        redirect: 'follow',
        signal,
        headers: method === 'GET' ? { Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8' } : { Accept: '*/*' },
    });
    if (method === 'GET') {
        try {
            await response.body?.cancel();
        } catch {
            // ignore — we only needed the final URL
        }
    }
    return isResolvedDestination(url, response.url) ? response.url : null;
}

async function followRedirectOnce(url: string, timeoutMs: number): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        try {
            const fromHead = await fetchFinalUrl(url, 'HEAD', controller.signal);
            if (fromHead) return fromHead;
        } catch {
            // Some hosts reject HEAD — fall through to GET.
        }
        if (controller.signal.aborted) return null;
        try {
            return await fetchFinalUrl(url, 'GET', controller.signal);
        } catch {
            return null;
        }
    } finally {
        clearTimeout(timer);
    }
}

/** Resolve Vertex grounding redirects to destination URLs in parallel. */
export async function chatMessageSourcesResolveRedirects(
    sources: ReadonlyArray<ChatMessageSource>,
    options?: { timeoutMs?: number },
): Promise<ChatMessageSource[]> {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (sources.length === 0) return [];

    return Promise.all(
        sources.map(async (source) => {
            if (!isGroundingRedirectUrl(source.url)) return source;
            const resolved = await followRedirectOnce(source.url, timeoutMs);
            if (!resolved) return source;
            return { title: source.title, url: resolved };
        }),
    );
}
