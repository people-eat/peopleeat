import { Link } from '@tanstack/react-router';

import { useT } from '../hooks/useT';

/** Shared "no access" surface for cook profile routes whose loader saw a null `cook`. */
export function CookAccessDenied() {
    const { t } = useT('profileCook');

    return (
        <main id="main-content" className="mx-auto grid min-h-screen max-w-lg content-center gap-4 p-8 text-center">
            <h1 className="font-serif text-3xl/tight text-foreground">{t('m.noAccess')}</h1>
            <p className="text-muted-foreground">{t('m.cookOnlyArea')}</p>
            <Link to="/{-$locale}/profile" className="text-sm font-medium text-accent-foreground underline-offset-4 hover:underline">
                {t('m.backToProfile')}
            </Link>
        </main>
    );
}
