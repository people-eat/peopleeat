import { createRootRoute, Outlet } from '@tanstack/react-router';

import { RootDocument } from '../web/components/RootDocument';
import { RouteError } from '../web/components/RouteError';
import { RouteNotFound } from '../web/components/RouteNotFound';
import { rootHead } from '../web/seo/rootHead';

export const Route = createRootRoute({
    head: rootHead,
    component: RootOutlet,
    errorComponent: RouteError,
    notFoundComponent: RouteNotFound,
    shellComponent: RootDocument,
});

function RootOutlet() {
    return <Outlet />;
}
