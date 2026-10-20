import { useEffect } from 'react';

// Production Clarity project ID (public).
const MICROSOFT_CLARITY_PROJECT_ID = 'l6qxwo5j7v';

declare global {
    interface Window {
        clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
    }
}

export function AnalyticsClarity({ enabled }: { enabled: boolean }) {
    useEffect(() => {
        if (!enabled) {
            return;
        }

        const scriptId = 'peopleeat-clarity';
        if (document.getElementById(scriptId)) {
            return;
        }

        window.clarity =
            window.clarity ??
            function clarity(...args: unknown[]) {
                (window.clarity!.q = window.clarity!.q ?? []).push(args);
            };

        const script = document.createElement('script');
        script.id = scriptId;
        script.async = true;
        script.src = `https://www.clarity.ms/tag/${MICROSOFT_CLARITY_PROJECT_ID}`;
        document.head.appendChild(script);
    }, [enabled]);

    return null;
}
