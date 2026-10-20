/**
 * True when a browser-reported GraphQL / fetch failure message is expected
 * noise (tab close, refresh, SSE idle drop, brief offline) rather than an
 * application bug. Mirrors server-side `isClientConnectionAbortError`.
 */
const BENIGN_MESSAGES = new Set([
    'load failed', // Safari / WebKit
    'failed to fetch', // Chromium
    'networkerror when attempting to fetch resource.', // Firefox
    'network request failed',
    'network error',
    'the operation was aborted.',
    'the user aborted a request.',
    'the request was aborted.',
    'fetch is aborted',
    'aborted',
]);

export function isBenignClientNetworkErrorMessage(message: string): boolean {
    const normalized = message
        .trim()
        .toLowerCase()
        // URQL CombinedError prefixes network failures with "[Network] ".
        .replace(/^\[network\]\s*/, '');

    if (!normalized) return false;
    return BENIGN_MESSAGES.has(normalized);
}
