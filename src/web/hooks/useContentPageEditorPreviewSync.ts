import { useEffect } from 'react';
import type { RefObject } from 'react';

/** Editor form blocks that drive the sticky live preview scroll position. */
const CONTENT_EDITOR_ANCHOR_ATTR = 'data-content-editor-anchor';
/** Matching targets inside `ContentPageView` / section renderers. */
const CONTENT_PREVIEW_ANCHOR_ATTR = 'data-content-preview-anchor';

/**
 * Keeps the admin split preview scrolled to the block that matches the form
 * section currently in the workspace scroll band.
 */
export function useContentPageEditorPreviewSync({
    editorColumnRef,
    previewScrollRef,
    enabled,
}: {
    editorColumnRef: RefObject<HTMLElement | null>;
    previewScrollRef: RefObject<HTMLElement | null>;
    enabled: boolean;
}) {
    useEffect(() => {
        if (!enabled) return;
        if (typeof window === 'undefined') return;

        const editorColumn = editorColumnRef.current;
        const previewPaneOrNull = previewScrollRef.current;
        if (!editorColumn || !previewPaneOrNull) return;
        const previewPane: HTMLElement = previewPaneOrNull;

        const scrollRoot = editorColumn.closest('.workspace-inset-scroll');
        const anchors = [...editorColumn.querySelectorAll<HTMLElement>(`[${CONTENT_EDITOR_ANCHOR_ATTR}]`)];
        if (anchors.length === 0) return;

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const ratios = new Map<string, number>();
        let activeKey: string | null = null;
        let frame = 0;

        function syncPreview(key: string) {
            const target = previewPane.querySelector<HTMLElement>(`[${CONTENT_PREVIEW_ANCHOR_ATTR}="${key}"]`);
            if (!target) return;
            const previewRect = previewPane.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            const nextTop = previewPane.scrollTop + (targetRect.top - previewRect.top);
            previewPane.scrollTo({ top: Math.max(0, nextTop), behavior: reducedMotion ? 'auto' : 'smooth' });
        }

        function pickActive() {
            let bestKey: string | null = null;
            let bestRatio = 0;
            let bestTop = Number.POSITIVE_INFINITY;
            for (const anchor of anchors) {
                const key = anchor.getAttribute(CONTENT_EDITOR_ANCHOR_ATTR);
                if (!key) continue;
                const ratio = ratios.get(key) ?? 0;
                if (ratio <= 0) continue;
                const top = anchor.getBoundingClientRect().top;
                if (ratio > bestRatio + 0.05 || (Math.abs(ratio - bestRatio) <= 0.05 && top < bestTop)) {
                    bestKey = key;
                    bestRatio = ratio;
                    bestTop = top;
                }
            }
            if (bestKey && bestKey !== activeKey) {
                activeKey = bestKey;
                syncPreview(bestKey);
            }
        }

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    const key = entry.target.getAttribute(CONTENT_EDITOR_ANCHOR_ATTR);
                    if (!key) continue;
                    ratios.set(key, entry.isIntersecting ? entry.intersectionRatio : 0);
                }
                cancelAnimationFrame(frame);
                frame = requestAnimationFrame(pickActive);
            },
            {
                root: scrollRoot instanceof Element ? scrollRoot : null,
                // Active band: upper portion of the workspace scroller.
                rootMargin: '-10% 0px -55% 0px',
                threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
            },
        );

        for (const anchor of anchors) observer.observe(anchor);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, [editorColumnRef, previewScrollRef, enabled]);
}
