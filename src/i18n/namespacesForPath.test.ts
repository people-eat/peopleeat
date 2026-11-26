import { describe, expect, it } from 'vitest';

import { namespacesForPath, namespacesLoadedForPath, namespacesLoadedForProfileSession } from './namespacesForPath';

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
        expect(namespacesForPath('/profile/booking-requests/abc')).toEqual(['common', 'public', 'profile', 'publicBooking']);
        expect(namespacesForPath('/profile/booking-requests/abc/edit')).toEqual(['common', 'public', 'profile', 'publicBooking']);
        expect(namespacesForPath('/profile/booking-requests/abc/offers/def')).toEqual(['common', 'public', 'profile']);
    });

    it('loads admin with public and profileCook for content preview and cook inventory cards', () => {
        expect(namespacesForPath('/admin')).toEqual(['common', 'public', 'admin', 'profileCook']);
        expect(namespacesForPath('/admin/users')).toEqual(['common', 'public', 'admin', 'profileCook']);
        expect(namespacesForPath('/admin/meals')).toEqual(['common', 'public', 'admin', 'profileCook']);
    });

    it('adds publicBooking on admin booking request create and edit', () => {
        expect(namespacesForPath('/admin/booking-requests/create')).toEqual(['common', 'public', 'admin', 'profileCook', 'publicBooking']);
        expect(namespacesForPath('/admin/booking-requests/abc/edit')).toEqual([
            'common',
            'public',
            'admin',
            'profileCook',
            'publicBooking',
        ]);
        expect(namespacesForPath('/admin/booking-requests/abc')).toEqual(['common', 'public', 'admin', 'profileCook']);
        expect(namespacesForPath('/admin/booking-requests')).toEqual(['common', 'public', 'admin', 'profileCook']);
    });

    it('adds profile role catalogs to the loaded set', () => {
        expect(namespacesLoadedForPath('/profile')).toEqual(['common', 'public', 'profile', 'profileCook', 'profileCustomer']);
        expect(namespacesLoadedForPath('/profile/account')).toEqual(['common', 'public', 'profile', 'profileCook', 'profileCustomer']);
        expect(namespacesLoadedForPath('/profile/booking-requests/abc/edit')).toEqual([
            'common',
            'public',
            'profile',
            'publicBooking',
            'profileCustomer',
        ]);
        expect(namespacesLoadedForPath('/admin/account')).toEqual(['common', 'public', 'admin', 'profileCook', 'profile']);
        expect(namespacesLoadedForPath('/profile/booking-requests/abc/offers/def')).toEqual([
            'common',
            'public',
            'profile',
            'profileCook',
            'profileCustomer',
        ]);
        expect(namespacesLoadedForPath('/profile/booking-request-pool/abc/create')).toEqual([
            'common',
            'public',
            'profile',
            'profileCook',
            'profileCustomer',
        ]);
        expect(namespacesLoadedForPath('/profile/meals')).toEqual(['common', 'public', 'profile', 'profileCook']);
        expect(namespacesLoadedForPath('/admin/users')).toEqual(['common', 'public', 'admin', 'profileCook']);
    });

    it('unions the signed-in role onto the path list', () => {
        expect(namespacesLoadedForProfileSession('/profile/meals', true)).toEqual(['common', 'public', 'profile', 'profileCook']);
        expect(namespacesLoadedForProfileSession('/profile/booking-request-pool/abc/create', true)).toEqual([
            'common',
            'public',
            'profile',
            'profileCook',
            'profileCustomer',
        ]);
        expect(namespacesLoadedForProfileSession('/profile/booking-requests/abc/offers/def', false)).toEqual([
            'common',
            'public',
            'profile',
            'profileCook',
            'profileCustomer',
        ]);
    });
});
