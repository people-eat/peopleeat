/**
 * Favicon URL for a chat citation source, via Google's public S2 service
 * (same approach ChatGPT / Perplexity use — domain hostname → cached icon).
 *
 * Gemini Google Search grounding often puts a Vertex AI Search redirect in
 * `url` (`vertexaisearch.cloud.google.com/grounding-api-redirect/…`) and the
 * real site domain in `title` (e.g. `uefa.com`). Prefer that title domain so
 * we do not request a favicon for Google's redirect host (which 404s).
 *
 * Returns null when no usable domain can be derived.
 */
export function sourceFaviconUrl(url: string, options?: { title?: string; size?: 16 | 32 | 64 }): string | null {
    const size = options?.size ?? 32;
    const domain = faviconDomainFromSource(url, options?.title);
    if (!domain) return null;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

/** Hostnames that are Gemini / Vertex grounding redirect hosts, not real sources. */
const GROUNDING_REDIRECT_HOSTS = new Set(['vertexaisearch.cloud.google.com']);

/**
 * Domain to look up a favicon for. For grounding redirects, uses `title` when
 * it looks like a hostname; otherwise the URL hostname (or null).
 */
export function faviconDomainFromSource(url: string, title?: string): string | null {
    try {
        const { hostname } = new URL(url);
        if (!hostname) return null;

        if (GROUNDING_REDIRECT_HOSTS.has(hostname.toLowerCase())) {
            const candidate = title?.trim();
            return candidate && looksLikeHostname(candidate) ? candidate.toLowerCase() : null;
        }

        return hostname;
    } catch {
        return null;
    }
}

/** `uefa.com`, `www.bbc.co.uk` — not a page title with spaces or a path. */
function looksLikeHostname(value: string): boolean {
    if (!value || /\s/.test(value) || value.includes('/') || value.includes(':')) return false;
    return /^[a-z0-9]([a-z0-9-]*\.)+[a-z]{2,}$/i.test(value);
}
