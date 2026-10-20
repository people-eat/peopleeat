import { useEffect } from 'react';

// Production GA measurement ID (public).
const GOOGLE_ANALYTICS_MEASUREMENT_ID = 'G-165LKCGVJJ';

declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
    }
}

export function AnalyticsGoogle({ enabled }: { enabled: boolean }) {
    useEffect(() => {
        if (!enabled) {
            return;
        }

        const scriptId = 'peopleeat-gtag-js';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_MEASUREMENT_ID}`;
            document.head.appendChild(script);
        }

        window.dataLayer = window.dataLayer ?? [];
        window.gtag =
            window.gtag ??
            function gtag(...args: unknown[]) {
                window.dataLayer?.push(args);
            };
        window.gtag('js', new Date());
        window.gtag('config', GOOGLE_ANALYTICS_MEASUREMENT_ID, {
            page_path: window.location.pathname,
        });
    }, [enabled]);

    return null;
}
