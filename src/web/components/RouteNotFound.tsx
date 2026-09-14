import { useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useLocale } from '../hooks/useLocale';
import { localePath } from '../utils/locale';

export function RouteNotFound() {
    const location = useLocation();
    const locale = useLocale();

    useEffect(() => {
        console.warn(`[404] Not found: ${location.pathname}`);
    }, [location.pathname]);

    return (
        <main id="main-content" className="flex min-h-screen items-center justify-center">
            <div className="text-center">
                <h1 className="text-4xl font-bold">404</h1>
                <p className="text-muted-foreground mt-2">{{ de: 'Seite nicht gefunden', en: 'Page not found' }[locale]}</p>
                <a
                    href={localePath(locale, '/')}
                    className="mt-6 inline-block text-sm font-medium underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                    {{ de: 'Zur Startseite', en: 'Back to home' }[locale]}
                </a>
            </div>
        </main>
    );
}
