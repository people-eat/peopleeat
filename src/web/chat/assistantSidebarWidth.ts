const STORAGE_KEY = 'peopleeat.assistant.sidebarWidthRem';

export const ASSISTANT_SIDEBAR_WIDTH_DEFAULT_REM = 22;
const ASSISTANT_SIDEBAR_WIDTH_MIN_REM = 18;
const ASSISTANT_SIDEBAR_WIDTH_MAX_VIEWPORT_FRACTION = 0.5;

function assistantSidebarWidthMaxRem(): number {
    if (typeof window === 'undefined') return Number.POSITIVE_INFINITY;
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return (window.innerWidth * ASSISTANT_SIDEBAR_WIDTH_MAX_VIEWPORT_FRACTION) / rootFontSize;
}

export function clampAssistantSidebarWidthRem(rem: number): number {
    const maxRem = Math.max(ASSISTANT_SIDEBAR_WIDTH_MIN_REM, assistantSidebarWidthMaxRem());
    return Math.min(maxRem, Math.max(ASSISTANT_SIDEBAR_WIDTH_MIN_REM, rem));
}

export function readAssistantSidebarWidthRem(): number {
    if (typeof localStorage === 'undefined') return ASSISTANT_SIDEBAR_WIDTH_DEFAULT_REM;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return ASSISTANT_SIDEBAR_WIDTH_DEFAULT_REM;
        const parsed = Number.parseFloat(raw);
        if (!Number.isFinite(parsed)) return ASSISTANT_SIDEBAR_WIDTH_DEFAULT_REM;
        return clampAssistantSidebarWidthRem(parsed);
    } catch {
        return ASSISTANT_SIDEBAR_WIDTH_DEFAULT_REM;
    }
}

export function writeAssistantSidebarWidthRem(rem: number): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, String(clampAssistantSidebarWidthRem(rem)));
    } catch {
        // Quota / private mode — best-effort.
    }
}
