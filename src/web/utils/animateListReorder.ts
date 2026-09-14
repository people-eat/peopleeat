import { flushSync } from 'react-dom';

const REORDER_DURATION_MS = 250;
const REORDER_EASING = 'ease-out';

/**
 * FLIP-animates children marked with `data-reorder-id` after `apply` mutates
 * their order in the DOM. Skips when `prefers-reduced-motion: reduce` matches
 * or the list is missing. Translate distance equals the swap offset (intentional
 * exception to the usual ≤8px motion guardrail — see docs/styles/motion.md).
 */
export function animateListReorder(listEl: HTMLElement | null, apply: () => void): void {
    if (listEl == null || typeof window === 'undefined') {
        apply();
        return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        apply();
        return;
    }

    const before = new Map<string, DOMRect>();
    for (const child of listEl.children) {
        if (!(child instanceof HTMLElement)) continue;
        const id = child.dataset.reorderId;
        if (id == null) continue;
        before.set(id, child.getBoundingClientRect());
    }

    flushSync(apply);

    const playing: HTMLElement[] = [];
    for (const child of listEl.children) {
        if (!(child instanceof HTMLElement)) continue;
        const id = child.dataset.reorderId;
        if (id == null) continue;
        const prev = before.get(id);
        if (prev == null) continue;
        const next = child.getBoundingClientRect();
        const dy = prev.top - next.top;
        if (Math.abs(dy) < 0.5) continue;
        child.style.transition = 'none';
        child.style.transform = `translateY(${dy}px)`;
        playing.push(child);
    }

    if (playing.length === 0) return;

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            for (const child of playing) {
                child.style.transition = `transform ${REORDER_DURATION_MS}ms ${REORDER_EASING}`;
                child.style.transform = '';
                const clear = (event: TransitionEvent) => {
                    if (event.target !== child || event.propertyName !== 'transform') return;
                    child.style.transition = '';
                    child.removeEventListener('transitionend', clear);
                };
                child.addEventListener('transitionend', clear);
            }
        });
    });
}
