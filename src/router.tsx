import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { RouteError } from './web/components/RouteError';
import { RouteNotFound } from './web/components/RouteNotFound';

export function getRouter() {
    const router = createTanStackRouter({
        routeTree,
        scrollRestoration: true,
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
