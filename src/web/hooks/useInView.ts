import { useEffect, useRef, useState } from 'react';

/**
 * Flips `inView` to `true` the first time the observed element crosses the
 * intersection threshold, then disconnects. `prefers-reduced-motion: reduce`
 * short-circuits so consumers render the final state with no transition.
 */
export function useInView<T extends Element>(options?: { threshold?: number; rootMargin?: string }) {
    const ref = useRef<T | null>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setInView(true);
            return;
        }

        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setInView(true);
                        observer.disconnect();
                        return;
                    }
                }
            },
            {
                threshold: options?.threshold ?? 0.15,
                rootMargin: options?.rootMargin ?? '0px 0px -40px 0px',
            },
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, [options?.threshold, options?.rootMargin]);

    return { ref, inView };
}
