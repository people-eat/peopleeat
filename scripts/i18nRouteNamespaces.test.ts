import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { collectRouteNamespaceUsage, findRouteNamespaceMismatches, samplePathFromRouteId } from './i18nRouteNamespaces';

const repoRoot = process.cwd();

describe('samplePathFromRouteId', () => {
    it('strips the locale segment, flattens trailing underscores, and fills params', () => {
        expect(samplePathFromRouteId('/{-$locale}')).toBe('/');
        expect(samplePathFromRouteId('/{-$locale}/')).toBe('/');
        expect(samplePathFromRouteId('/{-$locale}/admin/')).toBe('/admin');
        expect(samplePathFromRouteId('/{-$locale}/admin/booking-requests_/$bookingRequestId_/edit')).toBe('/admin/booking-requests/x/edit');
        expect(samplePathFromRouteId('/{-$locale}/profile/booking-requests_/$bookingRequestId_/edit')).toBe(
            '/profile/booking-requests/x/edit',
        );
    });
});

describe('collectRouteNamespaceUsage', () => {
    it('sees publicBooking on admin booking-request edit via form-default helpers', () => {
        const routeFile = path.join(repoRoot, 'src/routes/{-$locale}/admin/booking-requests_.$bookingRequestId_.edit.tsx');
        const used = collectRouteNamespaceUsage(routeFile, 'admin');
        expect([...used].sort()).toContain('publicBooking');
        expect([...used].sort()).toContain('admin');
    });

    it('does not require publicBooking on a generic admin page', () => {
        const routeFile = path.join(repoRoot, 'src/routes/{-$locale}/admin/users_.list.tsx');
        const used = collectRouteNamespaceUsage(routeFile, 'admin');
        expect(used.has('publicBooking')).toBe(false);
    });

    it('sees the other role catalog on cross-shell offer cards', () => {
        const cookCreate = path.join(repoRoot, 'src/routes/{-$locale}/profile/booking-request-pool_.$bookingRequestId_.create.tsx');
        expect([...collectRouteNamespaceUsage(cookCreate, 'profile')]).toContain('profileCustomer');
        const customerOffer = path.join(
            repoRoot,
            'src/routes/{-$locale}/profile/booking-requests_.$bookingRequestId_.offers_.$bookingRequestOfferId.tsx',
        );
        expect([...collectRouteNamespaceUsage(customerOffer, 'profile')]).toContain('profileCook');
    });
});

describe('findRouteNamespaceMismatches', () => {
    it('passes for every locale route against namespacesLoadedForPath', () => {
        const mismatches = findRouteNamespaceMismatches();
        expect(mismatches).toEqual([]);
    });
});
