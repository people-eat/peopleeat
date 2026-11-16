import { describe, expect, it } from 'vitest';

import { namespacesForPath } from './namespacesForPath';

describe('namespacesForPath', () => {
    it('loads common and public on marketing pages', () => {
        expect(namespacesForPath('/')).toEqual(['common', 'public']);
        expect(namespacesForPath('/about-us')).toEqual(['common', 'public']);
        expect(namespacesForPath('/log-on')).toEqual(['common', 'public']);
    });

    it('adds publicBooking on the public booking funnel', () => {
        expect(namespacesForPath('/booking-request')).toEqual(['common', 'public', 'publicBooking']);
        expect(namespacesForPath('/booking-request/form')).toEqual(['common', 'public', 'publicBooking']);
        expect(namespacesForPath('/booking-request/plan')).toEqual(['common', 'public', 'publicBooking']);
        expect(namespacesForPath('/booking-request/abc/submitted')).toEqual(['common', 'public', 'publicBooking']);
    });

    it('loads profile chrome with public for Header/Footer, without cook or customer catalogs', () => {
        expect(namespacesForPath('/profile')).toEqual(['common', 'public', 'profile']);
        expect(namespacesForPath('/profile/account')).toEqual(['common', 'public', 'profile']);
        expect(namespacesForPath('/profile/booking-requests')).toEqual(['common', 'public', 'profile']);
        expect(namespacesForPath('/profile/booking-request-pool')).toEqual(['common', 'public', 'profile']);
    });

    it('adds publicBooking on customer booking request detail and edit', () => {
        expect(namespacesForPath('/profile/booking-requests/abc')).toEqual(['common', 'public', 'publicBooking', 'profile']);
        expect(namespacesForPath('/profile/booking-requests/abc/edit')).toEqual(['common', 'public', 'publicBooking', 'profile']);
        expect(namespacesForPath('/profile/booking-requests/abc/offers/def')).toEqual(['common', 'public', 'profile']);
    });

    it('loads admin with public for content-page preview, without profile catalogs', () => {
        expect(namespacesForPath('/admin')).toEqual(['common', 'public', 'admin']);
        expect(namespacesForPath('/admin/users')).toEqual(['common', 'public', 'admin']);
    });
});
