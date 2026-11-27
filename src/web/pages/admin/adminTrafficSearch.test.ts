import { describe, expect, it } from 'vitest';

import { WEB_PAGE_VISIT_INDEX_RANK_ID } from '../../../shared/webPage';
import {
    adminTrafficPageVariables,
    adminTrafficPreviousRange,
    adminTrafficSearchResolve,
    adminTrafficSearchToUrl,
    adminTrafficToggleCompareId,
    parseAdminTrafficSearch,
} from './adminTrafficSearch';

describe('adminTrafficSearch', () => {
    it('parses comma-separated city ids including overview', () => {
        const search = parseAdminTrafficSearch({ keys: 'CITIES', cityId: `${WEB_PAGE_VISIT_INDEX_RANK_ID},city_a,city_b` });
        const resolved = adminTrafficSearchResolve(search);
        expect(resolved.focusedKey).toBe('CITIES');
        expect(resolved.cityIds).toEqual([WEB_PAGE_VISIT_INDEX_RANK_ID, 'city_a', 'city_b']);
        expect(resolved.compareIds).toEqual([WEB_PAGE_VISIT_INDEX_RANK_ID, 'city_a', 'city_b']);
        expect(adminTrafficPageVariables(search).entity).toEqual(
            expect.objectContaining({ cityIds: [WEB_PAGE_VISIT_INDEX_RANK_ID, 'city_a', 'city_b'] }),
        );
    });

    it('toggles an entity id instead of replacing the set', () => {
        const resolved = adminTrafficSearchResolve({ keys: 'VENUES', partnerVenueId: 'venue_a' });
        const added = adminTrafficSearchResolve({
            ...adminTrafficSearchToUrl(resolved),
            ...adminTrafficSearchToUrl({ ...resolved, ...adminTrafficToggleCompareId(resolved, 'venue_b') }),
        });
        expect(added.compareIds.sort()).toEqual(['venue_a', 'venue_b']);
        const removed = adminTrafficToggleCompareId({ ...resolved, ...added }, 'venue_a');
        expect(removed.partnerVenueIds).toEqual(['venue_b']);
    });

    it('clears entity ids from the URL when none are selected', () => {
        const url = adminTrafficSearchToUrl(adminTrafficSearchResolve({ keys: 'CITIES', cityId: 'city_a', metric: 'UNIQUE_SESSIONS' }));
        expect(url.cityId).toBe('city_a');
        expect(url.metric).toBe('UNIQUE_SESSIONS');
        const cleared = adminTrafficSearchToUrl(adminTrafficSearchResolve({ keys: 'CITIES' }));
        expect(cleared.cityId).toBeUndefined();
    });

    it('turns the prior-range overlay off when adding the second series', () => {
        const one = adminTrafficSearchResolve({ keys: 'CITIES', cityId: 'city_a' });
        expect(one.previous).toBe(true);
        const second = adminTrafficToggleCompareId(one, 'city_b');
        expect(second.previous).toBe(false);
        const two = adminTrafficSearchResolve({
            ...adminTrafficSearchToUrl(one),
            ...adminTrafficSearchToUrl({ ...one, ...second }),
        });
        expect(two.compareIds.sort()).toEqual(['city_a', 'city_b']);
        expect(two.previous).toBe(false);
        expect(adminTrafficSearchToUrl(two).previous).toBe('0');
        const third = adminTrafficToggleCompareId(two, 'city_c');
        expect(third.previous).toBeUndefined();
        expect(third.cityIds).toEqual(['city_a', 'city_b', 'city_c']);
    });

    it('maps the prior window to the same-length days immediately before from', () => {
        expect(adminTrafficPreviousRange('2026-11-01', '2026-11-24')).toEqual({ from: '2026-10-08', to: '2026-10-31' });
    });

    it('splits booking-request plan by partnerVenueId', () => {
        const search = parseAdminTrafficSearch({ keys: 'BOOKING_REQUEST_PLAN', partnerVenueId: 'venue_a,venue_b' });
        const resolved = adminTrafficSearchResolve(search);
        expect(resolved.focusedKey).toBe('BOOKING_REQUEST_PLAN');
        expect(resolved.partnerVenueIds).toEqual(['venue_a', 'venue_b']);
        expect(resolved.compareIds).toEqual(['venue_a', 'venue_b']);
        expect(adminTrafficSearchToUrl(resolved).partnerVenueId).toBe('venue_a,venue_b');
    });

    it('splits coming-to by countryId', () => {
        const search = parseAdminTrafficSearch({ keys: 'COMING_TO', countryId: 'netherlands,switzerland', scope: 'INDEX' });
        const resolved = adminTrafficSearchResolve(search);
        expect(resolved.focusedKey).toBe('COMING_TO');
        expect(resolved.countryIds).toEqual(['netherlands', 'switzerland']);
        expect(resolved.compareIds).toEqual(['netherlands', 'switzerland']);
        expect(adminTrafficSearchToUrl(resolved).countryId).toBe('netherlands,switzerland');
        expect(adminTrafficPageVariables(search).entity).toEqual(expect.objectContaining({ countryIds: ['netherlands', 'switzerland'] }));
        expect(resolved.scope).toBe('ALL');
        expect(adminTrafficSearchResolve({ keys: 'COMING_TO', scope: 'INDEX' }).scope).toBe('ALL');
    });
});
