import { describe, expect, it } from 'vitest';

import {
    adminAnalyticsSearchForPageKey,
    adminAnalyticsSearchForRange,
    adminAnalyticsTabForWebPageKey,
    adminTrafficSearchForAnalyticsTab,
} from './adminAnalyticsSearch';

describe('adminAnalyticsSearch links', () => {
    const range = { from: '2099-01-01', to: '2099-01-31' };

    it('omits the default booking tab from the URL and keeps from/to', () => {
        expect(adminAnalyticsSearchForRange(range, 'booking')).toEqual({ from: range.from, to: range.to, tab: undefined });
        expect(adminAnalyticsSearchForRange(range, 'gift-cards')).toEqual({
            from: range.from,
            to: range.to,
            tab: 'gift-cards',
        });
    });

    it('maps traffic page keys to the matching analytics tab', () => {
        expect(adminAnalyticsTabForWebPageKey('BOOKING_REQUEST_FORM')).toBe('booking');
        expect(adminAnalyticsTabForWebPageKey('GIFT_CARD')).toBe('gift-cards');
        expect(adminAnalyticsTabForWebPageKey('CHEF_SIGN_UP')).toBe('cooks');
        expect(adminAnalyticsTabForWebPageKey('SIGN_IN')).toBe('sign-in');
        expect(adminAnalyticsTabForWebPageKey('CITIES')).toBeUndefined();
        expect(adminAnalyticsSearchForPageKey(range, 'GIFT_CARD')).toEqual({
            from: range.from,
            to: range.to,
            tab: 'gift-cards',
        });
        expect(adminAnalyticsSearchForPageKey(range, 'BOOKING_REQUEST_FORM')?.tab).toBeUndefined();
        expect(adminAnalyticsSearchForPageKey(range, 'CITIES')).toBeUndefined();
    });

    it('builds a traffic search with the tab page key and range', () => {
        expect(adminTrafficSearchForAnalyticsTab(range, 'gift-cards')).toEqual({
            from: range.from,
            to: range.to,
            keys: 'GIFT_CARD',
        });
        expect(adminTrafficSearchForAnalyticsTab(range, 'sign-in').keys).toBe('SIGN_IN');
        expect(adminTrafficSearchForAnalyticsTab(range, 'booking').keys).toBe('BOOKING_REQUEST_FORM');
        expect(adminTrafficSearchForAnalyticsTab(range, 'cooks').keys).toBe('CHEF_SIGN_UP');
    });
});
