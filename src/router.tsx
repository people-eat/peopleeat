import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { RouteError } from './web/components/RouteError';
import { RouteNotFound } from './web/components/RouteNotFound';

export function getRouter() {
    const router = createTanStackRouter({
        routeTree,
        scrollRestoration: true,
        // Workspace shells scroll inset panes, not `window`. Without these selectors
        // TanStack copies nested scrollTops onto the next route (same DOM path /
        // `data-scroll-restoration-id`). See docs/styles/theme.md.
        scrollToTopSelectors: [
            '[data-scroll-restoration-id="workspace-inset"]',
            '[data-scroll-restoration-id="workspace-pinned"]',
            '[data-scroll-restoration-id="booking-form"]',
        ],
        defaultPreload: 'intent',
        defaultPreloadStaleTime: 0,
        // Replaces TanStack Router's built-in ErrorComponent (red technical box).
        defaultErrorComponent: RouteError,
        // Loader-thrown `notFound()` on leaf routes without their own notFoundComponent.
        defaultNotFoundComponent: RouteNotFound,
    });

    return router;
}

declare module '@tanstack/react-router' {
    interface Register {
        router: ReturnType<typeof getRouter>;
    }
}
