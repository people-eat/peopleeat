import { Link } from '@tanstack/react-router';

import { useLocale } from '../hooks/useLocale';

/** Shared "no access" surface for cook profile routes whose loader saw a null `cook`. */
export function CookAccessDenied() {
    const locale = useLocale();

    return (
        <main id="main-content" className="mx-auto grid min-h-screen max-w-lg content-center gap-4 p-8 text-center">
            <h1 className="font-serif text-3xl/tight text-foreground">{{ de: 'Kein Zugriff', en: 'No access' }[locale]}</h1>
            <p className="text-muted-foreground">
                {
                    {
                        de: 'Dieser Bereich ist nur für Köche verfügbar.',
                        en: 'This area is only available to cooks.',
                    }[locale]
                }
            </p>
            <Link to="/{-$locale}/profile" className="text-sm font-medium text-accent-foreground underline-offset-4 hover:underline">
                {{ de: 'Zum Profil', en: 'Back to profile' }[locale]}
            </Link>
        </main>
    );
}
