import { isNotFound, useRouter } from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { useLayoutEffect, useState } from 'react';
import { isStaleClientChunkErrorMessage } from '../../shared/isStaleClientChunkErrorMessage';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
import { clientObservabilityRouteErrorReport } from '../observability/clientObservability';
import { localePath } from '../utils/locale';
import { staleClientChunkReloadOnce } from '../utils/staleClientChunkReload';
import { Button } from './base/button';
import { RouteNotFound } from './RouteNotFound';

export function RouteError({ error, reset }: ErrorComponentProps) {
    // Component-thrown `notFound()` hits the per-route error CatchBoundary first.
    if (isNotFound(error)) {
        return <RouteNotFound />;
    }

    return <RouteErrorFallback error={error} reset={reset} />;
}

function RouteErrorFallback({ error, reset }: ErrorComponentProps) {
    const router = useRouter();
    const locale = useLocale();
    const { t } = useT('common');
    const message = error instanceof Error ? error.message : String(error);
    const isStaleChunk = isStaleClientChunkErrorMessage(message);
    const [hideForReload, setHideForReload] = useState(isStaleChunk);

    useLayoutEffect(() => {
        if (isStaleChunk && staleClientChunkReloadOnce()) {
            return;
        }
        setHideForReload(false);
        console.error('[route-error]', error);
        clientObservabilityRouteErrorReport(message);
    }, [error, isStaleChunk, message]);

    if (hideForReload) {
        return null;
    }

    return (
        <main id="main-content" className="flex min-h-screen items-center justify-center px-4">
            <div className="max-w-md text-center">
                <h1 className="text-4xl font-bold">{t('routeError.title')}</h1>
                <p className="text-muted-foreground mt-2">{t('routeError.body')}</p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Button
                        type="button"
                        onClick={() => {
                            if (isStaleChunk) {
                                window.location.reload();
                                return;
                            }
                            reset();
                            void router.invalidate();
                        }}
                    >
                        {t('routeError.tryAgain')}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                        <a href={localePath(locale, '/')}>{t('routeError.backHome')}</a>
                    </Button>
                </div>
            </div>
        </main>
    );
}
