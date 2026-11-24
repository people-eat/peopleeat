/**
 * True when a browser route / dynamic-import failure is the expected post-deploy
 * stale-chunk case (old tab still referencing hashed assets that no longer exist)
 * rather than an application bug.
 */
const STALE_CHUNK_PATTERNS = [
    /failed to fetch dynamically imported module/i,
    /error loading dynamically imported module/i,
    /importing a module script failed/i,
    /unable to preload css/i,
];

export function isStaleClientChunkErrorMessage(message: string): boolean {
    const normalized = message.trim();
    if (!normalized) return false;
    return STALE_CHUNK_PATTERNS.some((pattern) => pattern.test(normalized));
}
