import { isNotFound, useRouter } from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useLocale } from '../hooks/useLocale';
import { clientObservabilityRouteErrorReport } from '../observability/clientObservability';
import { localePath } from '../utils/locale';
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

    useEffect(() => {
        console.error('[route-error]', error);
        const message = error instanceof Error ? error.message : String(error);
        clientObservabilityRouteErrorReport(message);
    }, [error]);

    return (
        <main id="main-content" className="flex min-h-screen items-center justify-center px-4">
            <div className="max-w-md text-center">
                <h1 className="text-4xl font-bold">{{ de: 'Etwas ist schiefgelaufen', en: 'Something went wrong' }[locale]}</h1>
                <p className="text-muted-foreground mt-2">
                    {
                        {
                            de: 'Bitte versuche es erneut. Wenn das Problem bleibt, komm später wieder.',
                            en: 'Please try again. If it keeps happening, check back later.',
                        }[locale]
                    }
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Button
                        type="button"
                        onClick={() => {
                            reset();
                            void router.invalidate();
                        }}
                    >
                        {{ de: 'Erneut versuchen', en: 'Try again' }[locale]}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                        <a href={localePath(locale, '/')}>{{ de: 'Zur Startseite', en: 'Back to home' }[locale]}</a>
                    </Button>
                </div>
            </div>
        </main>
    );
}
