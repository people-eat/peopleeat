import type { Preview } from '@storybook/react-vite';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { Provider as GraphQLClientProvider } from 'urql';

import { TooltipProvider } from '../src/web/components/base/tooltip';
import { TimeZoneProvider } from '../src/web/hooks/useTimeZone';
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
            const locale = typeof context.globals.locale === 'string' ? context.globals.locale : 'de';
            const router = createStorybookRouter(Story, locale);
            return (
                <TooltipProvider>
                    <TimeZoneProvider timeZone={STORYBOOK_TIME_ZONE}>
                        <GraphQLClientProvider value={{}}>
                            <RouterProvider router={router} />
                        </GraphQLClientProvider>
                    </TimeZoneProvider>
                </TooltipProvider>
            );
        },
    ],
};

export default preview;
