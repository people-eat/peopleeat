import { useEffect, useState } from 'react';

/** Tracks `prefers-reduced-motion: reduce` for pausing autoplay media. */
export function usePrefersReducedMotion(): boolean {
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const sync = () => setReducedMotion(mediaQuery.matches);
        sync();
        mediaQuery.addEventListener('change', sync);
        return () => mediaQuery.removeEventListener('change', sync);
    }, []);

    return reducedMotion;
}
