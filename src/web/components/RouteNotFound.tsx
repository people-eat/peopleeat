import { useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
import { localePath } from '../utils/locale';

export function RouteNotFound() {
    const location = useLocation();
    const locale = useLocale();
    const { t } = useT('common');

    useEffect(() => {
        console.warn(`[404] Not found: ${location.pathname}`);
    }, [location.pathname]);

    return (
        <main id="main-content" className="flex min-h-screen items-center justify-center">
            <div className="text-center">
                <h1 className="text-4xl font-bold">404</h1>
                <p className="text-muted-foreground mt-2">{t('routeNotFound.body')}</p>
                <a
                    href={localePath(locale, '/')}
                    className="mt-6 inline-block text-sm font-medium underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                    {t('routeNotFound.backHome')}
                </a>
            </div>
        </main>
    );
}
