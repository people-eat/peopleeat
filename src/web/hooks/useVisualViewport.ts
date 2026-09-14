import { useEffect, useState } from 'react';

/**
 * Live `window.visualViewport` metrics. The visual viewport shrinks when a soft
 * keyboard appears; the layout viewport (`100vh` / `inset-y-0`) does not.
 * Returns `null` during SSR and on the first render — fall back until the first
 * client effect runs.
 */
export interface VisualViewportMetrics {
    height: number;
    offsetTop: number;
}

export function useVisualViewport(): VisualViewportMetrics | null {
    const [metrics, setMetrics] = useState<VisualViewportMetrics | null>(null);

    useEffect(() => {
        const vv = typeof window !== 'undefined' ? window.visualViewport : null;
        if (!vv) {
            setMetrics({ height: window.innerHeight, offsetTop: 0 });
            return;
        }
        const read = () => setMetrics({ height: vv.height, offsetTop: vv.offsetTop });
        read();
        vv.addEventListener('resize', read);
        vv.addEventListener('scroll', read);
        return () => {
            vv.removeEventListener('resize', read);
            vv.removeEventListener('scroll', read);
        };
    }, []);

    return metrics;
}
