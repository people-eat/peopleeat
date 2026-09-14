import { adminStubRouteBySlug } from './adminCatalog';
import { AdminStubPage } from './AdminStubPage';

const route = adminStubRouteBySlug('map');

export const adminMapPageTitle = route.title;
export const adminMapPageDescription = route.description;

export function AdminMapPage() {
    return <AdminStubPage title={route.title} />;
}
