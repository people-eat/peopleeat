const STORAGE_KEY = 'pe:stale-chunk-reload';

let listenStarted = false;

function storageGet(): string | null {
    try {
        return sessionStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

function storageSet(value: string): boolean {
    try {
        sessionStorage.setItem(STORAGE_KEY, value);
        return true;
    } catch {
        return false;
    }
}

/** True when this tab already attempted a one-shot reload for a stale chunk. */
export function staleClientChunkReloadAlreadyTried(): boolean {
    if (typeof window === 'undefined') return false;
    return storageGet() === '1';
}

/**
 * Reload once after a stale hashed asset 404. Returns true when a reload was
 * started. Without sessionStorage, skips reload to avoid an infinite loop.
 * Guard stays set for the tab session so a permanently broken / cached HTML
 * deploy cannot reload-loop.
 */
export function staleClientChunkReloadOnce(): boolean {
    if (typeof window === 'undefined') return false;
    if (staleClientChunkReloadAlreadyTried()) return false;
    if (!storageSet('1')) return false;
    window.location.reload();
    return true;
}

/**
 * Vite fires `vite:preloadError` when a preloaded / dynamic chunk fails. Prevent
 * the default throw and reload once so old tabs survive a deploy.
 */
export function staleClientChunkReloadListen(): void {
    if (typeof window === 'undefined' || listenStarted) return;
    listenStarted = true;
    window.addEventListener('vite:preloadError', (event) => {
        event.preventDefault();
        staleClientChunkReloadOnce();
    });
}
