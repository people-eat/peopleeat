import { describe, expect, it } from 'vitest';

import { webPageKeyFromPath } from './webPageKeyFromPath';

describe('webPageKeyFromPath', () => {
    it('maps fixed public routes', () => {
        expect(webPageKeyFromPath('/')).toEqual({ webPageKey: 'LANDING' });
        expect(webPageKeyFromPath('/booking-request/form')).toEqual({ webPageKey: 'BOOKING_REQUEST_FORM' });
        expect(webPageKeyFromPath('/log-on')).toEqual({ webPageKey: 'SIGN_IN' });
        expect(webPageKeyFromPath('/sign-in')).toEqual({ webPageKey: 'SIGN_IN' });
    });

    it('maps dynamic public routes', () => {
        expect(webPageKeyFromPath('/chefs/abc')).toEqual({ webPageKey: 'CHEFS', params: { cookId: 'abc' } });
        expect(webPageKeyFromPath('/cities/berlin')).toEqual({ webPageKey: 'CITIES', params: { cityId: 'berlin' } });
        expect(webPageKeyFromPath('/venues')).toEqual({ webPageKey: 'VENUES' });
        expect(webPageKeyFromPath('/venues/loft')).toEqual({ webPageKey: 'VENUES', params: { partnerVenueId: 'loft' } });
        expect(webPageKeyFromPath('/partners')).toEqual({ webPageKey: 'VENUES' });
        expect(webPageKeyFromPath('/partners/loft')).toEqual({ webPageKey: 'VENUES', params: { partnerVenueId: 'loft' } });
        expect(webPageKeyFromPath('/occasions/birthday')).toEqual({ webPageKey: 'OCCASIONS', params: { occasionId: 'birthday' } });
        expect(webPageKeyFromPath('/blog-posts/hello')).toEqual({ webPageKey: 'BLOG_POSTS', params: { blogPostId: 'hello' } });
        expect(webPageKeyFromPath('/gift-card/abc123/checkout')).toEqual({ webPageKey: 'GIFT_CARD' });
        expect(webPageKeyFromPath('/coming-to/netherlands')).toEqual({ webPageKey: 'COMING_TO' });
        expect(webPageKeyFromPath('/how-to-become-a-chef/switzerland')).toEqual({ webPageKey: 'FOUNDING_CHEF' });
        expect(webPageKeyFromPath('/coming-to/germany')).toBeNull();
    });

    it('skips admin and profile paths', () => {
        expect(webPageKeyFromPath('/admin')).toBeNull();
        expect(webPageKeyFromPath('/admin/sessions')).toBeNull();
        expect(webPageKeyFromPath('/profile')).toBeNull();
        expect(webPageKeyFromPath('/profile/booking-requests')).toBeNull();
    });
});
