import type { AssistantSidebarSurface } from './assistantSidebarCopy';

const STORAGE_PREFIX = 'peopleeat.assistant.activeChat.';

function storageKey(surface: AssistantSidebarSurface): string {
    return `${STORAGE_PREFIX}${surface}`;
}

export function readActiveChatId(surface: AssistantSidebarSurface): string | undefined {
    if (typeof sessionStorage === 'undefined') return undefined;
    try {
        const value = sessionStorage.getItem(storageKey(surface));
        return value && value.length > 0 ? value : undefined;
    } catch {
        return undefined;
    }
}

export function writeActiveChatId(surface: AssistantSidebarSurface, chatId: string): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
        sessionStorage.setItem(storageKey(surface), chatId);
    } catch {
        // Quota / private mode — resume is best-effort.
    }
}

export function clearActiveChatId(surface: AssistantSidebarSurface): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
        sessionStorage.removeItem(storageKey(surface));
    } catch {
        // ignore
    }
}
