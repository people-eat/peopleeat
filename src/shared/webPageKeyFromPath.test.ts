import { describe, expect, it } from 'vitest';

import { webPageKeyFromPath } from './webPageKeyFromPath';

describe('webPageKeyFromPath', () => {
    it('maps fixed public routes', () => {
        expect(webPageKeyFromPath('/')).toEqual({ webPageKey: 'LANDING' });
        expect(webPageKeyFromPath('/booking-request/form')).toEqual({ webPageKey: 'BOOKING_REQUEST_FORM' });
        expect(webPageKeyFromPath('/sign-in')).toEqual({ webPageKey: 'SIGN_IN' });
    });

    it('maps dynamic public routes', () => {
        expect(webPageKeyFromPath('/chefs/abc')).toEqual({ webPageKey: 'CHEFS', params: { cookId: 'abc' } });
        expect(webPageKeyFromPath('/cities/berlin')).toEqual({ webPageKey: 'CITIES' });
    });

    it('skips admin and profile paths', () => {
        expect(webPageKeyFromPath('/admin')).toBeNull();
        expect(webPageKeyFromPath('/admin/sessions')).toBeNull();
        expect(webPageKeyFromPath('/profile')).toBeNull();
        expect(webPageKeyFromPath('/profile/booking-requests')).toBeNull();
    });
});
