import { useEffect } from 'react';

/**
 * Page-scoped keyboard shortcuts. Fires for a single key when nothing editable
 * has focus (input / textarea / select / contenteditable) and no Ctrl/Meta/Alt
 * modifier is held. Handlers may call `event.preventDefault()` themselves.
 */
export type HotkeyMap = Record<string, (event: KeyboardEvent) => void>;

export function useHotkeys(bindings: HotkeyMap, enabled: boolean = true): void {
    useEffect(() => {
        if (!enabled) return undefined;
        const listener = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            const target = event.target as HTMLElement | null;
            if (target) {
                const tag = target.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
                if (target.isContentEditable) return;
            }
            const handler = bindings[event.key];
            if (handler) handler(event);
        };
        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
    }, [bindings, enabled]);
}
