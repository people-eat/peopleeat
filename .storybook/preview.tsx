import type { Preview } from '@storybook/react-vite';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { Suspense } from 'react';
import { Provider as GraphQLClientProvider } from 'urql';

import { I18N_WEB_NAMESPACES } from '../src/i18n/namespaces';
import { TooltipProvider } from '../src/web/components/base/tooltip';
import { I18nProvider } from '../src/web/components/I18nProvider';
import { TimeZoneProvider } from '../src/web/hooks/useTimeZone';
import { isLocale } from '../src/web/utils/locale';
import { STORYBOOK_TIME_ZONE } from './decorators';

import '../src/styles.css';

function createStorybookRouter(Story: () => ReactElement, locale: string) {
    const rootRoute = createRootRoute();
    const localeRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/$locale',
        component: Story,
    });

    return createRouter({
        routeTree: rootRoute.addChildren([localeRoute]),
        history: createMemoryHistory({ initialEntries: [`/${locale}`] }),
    });
}

const preview: Preview = {
    globalTypes: {
        locale: {
            description: 'UI locale for bilingual copy',
            toolbar: {
                icon: 'globe',
                items: [
                    { value: 'de', title: 'Deutsch', right: 'DE' },
                    { value: 'en', title: 'English', right: 'EN' },
                    { value: 'fr', title: 'Français', right: 'FR' },
                    { value: 'it', title: 'Italiano', right: 'IT' },
                ],
                dynamicTitle: true,
            },
        },
    },
    initialGlobals: {
        locale: 'de',
    },
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        layout: 'padded',
    },
    decorators: [
        (Story: () => ReactElement, context) => {
            const localeRaw = typeof context.globals.locale === 'string' ? context.globals.locale : 'de';
            const locale = isLocale(localeRaw) ? localeRaw : 'de';
            const router = createStorybookRouter(Story, locale);
            return (
                <TooltipProvider>
                    <TimeZoneProvider timeZone={STORYBOOK_TIME_ZONE}>
                        <GraphQLClientProvider value={{}}>
                            <Suspense fallback={null}>
                                <I18nProvider locale={locale} namespaces={I18N_WEB_NAMESPACES}>
                                    <RouterProvider router={router} />
                                </I18nProvider>
                            </Suspense>
                        </GraphQLClientProvider>
                    </TimeZoneProvider>
                </TooltipProvider>
            );
        },
    ],
};

export default preview;
