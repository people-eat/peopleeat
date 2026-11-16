import { createFileRoute, notFound, Outlet, redirect } from '@tanstack/react-router';
import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequestHeader, setResponseHeader } from '@tanstack/react-start/server';
import { Suspense } from 'react';

import { i18nResourcesLoad } from '../i18n/catalogCache';
import { namespacesForPath } from '../i18n/namespacesForPath';
import { I18nProvider } from '../web/components/I18nProvider';
import {
    buildLocaleHref,
    DEFAULT_LOCALE,
    isLocale,
    localeFromAcceptLanguage,
    localeFromParam,
    pathWithoutLocale,
} from '../web/utils/locale';

const LOCALE_COOKIE = 'locale';

const detectLocale = createIsomorphicFn()
    .server(() => {
        const cookie = getRequestHeader('cookie');
        const match = cookie?.match(/(?:^|;\s*)locale=([^;]+)/);
        if (match && isLocale(match[1])) return match[1];
        const detected = localeFromAcceptLanguage(getRequestHeader('accept-language'));
        setResponseHeader('Set-Cookie', `${LOCALE_COOKIE}=${detected}; Path=/; Max-Age=31536000; SameSite=Lax`);
        return detected;
    })
    .client(() => {
        const match = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/);
        if (match && isLocale(match[1])) return match[1];
        return DEFAULT_LOCALE;
    });

export const Route = createFileRoute('/{-$locale}')({
    beforeLoad: ({ params, location }) => {
        if (params.locale && !isLocale(params.locale)) {
            throw notFound();
        }
        if (!params.locale) {
            const detected = detectLocale();
            if (detected !== DEFAULT_LOCALE) {
                throw redirect({ href: buildLocaleHref(location, DEFAULT_LOCALE, detected) });
            }
        }
    },
    // Child navigations keep this match (`cause: 'stay'`) so default stale
    // reload never runs — e.g. `/` → `/admin` would keep `common`+`public` only.
    // Re-run on stay. Default stale reload is background and lets the child
    // paint first (`i18n catalog not loaded`); blocking waits for catalogs.
    shouldReload: ({ cause }) => cause === 'stay',
    loader: {
        handler: async ({ params, location }) => {
            const locale = localeFromParam(params);
            const namespaces = namespacesForPath(pathWithoutLocale(location.pathname));
            await i18nResourcesLoad(locale, namespaces);
            return { locale, namespaces };
        },
        staleReloadMode: 'blocking',
    },
    // Client hydrate restores loader data without re-running the loader side
    // effect, so `t()` in child `head()` would throw. Re-load here first:
    // parent heads run before children.
    head: async ({ loaderData }) => {
        if (loaderData) {
            await i18nResourcesLoad(loaderData.locale, loaderData.namespaces);
        }
        return {};
    },
    component: LocaleLayout,
});

function LocaleLayout() {
    const { locale, namespaces } = Route.useLoaderData();
    return (
        <Suspense fallback={null}>
            <I18nProvider locale={locale} namespaces={namespaces}>
                <Outlet />
            </I18nProvider>
        </Suspense>
    );
}
