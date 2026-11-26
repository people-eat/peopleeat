import type { GqlCAdminBookingRequestDateBasis } from '../../graphql/generated';
import { parseAdminOverviewRangeSearch } from './adminOverviewRange';
import type { AdminOverviewRangeSearch } from './adminOverviewRange';

export type AdminBookingRequestsOverviewSearch = AdminOverviewRangeSearch & {
    dateBasis?: GqlCAdminBookingRequestDateBasis;
};

export function parseAdminBookingRequestsOverviewSearch(search: Record<string, unknown>): AdminBookingRequestsOverviewSearch {
    const range = parseAdminOverviewRangeSearch(search);
    const dateBasis = search.dateBasis === 'dateTime' || search.dateBasis === 'createdAt' ? search.dateBasis : undefined;
    return { ...range, dateBasis };
}

export function adminBookingRequestsOverviewDateBasisResolve(search: AdminBookingRequestsOverviewSearch): GqlCAdminBookingRequestDateBasis {
    return search.dateBasis === 'dateTime' ? 'dateTime' : 'createdAt';
}

/** Omits default `createdAt` from the URL. */
export function adminBookingRequestsOverviewSearchForNavigate(next: {
    from: string;
    to: string;
    dateBasis: GqlCAdminBookingRequestDateBasis;
}): AdminBookingRequestsOverviewSearch {
    return {
        from: next.from,
        to: next.to,
        dateBasis: next.dateBasis === 'createdAt' ? undefined : next.dateBasis,
    };
}
