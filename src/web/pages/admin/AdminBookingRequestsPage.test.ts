import { describe, expect, it } from 'vitest';

import { adminBookingRequestsPageVariables, parseAdminBookingRequestsSearch } from './AdminBookingRequestsPage';

describe('parseAdminBookingRequestsSearch', () => {
    it('keeps a single status and drops a one-item statuses list into it', () => {
        expect(parseAdminBookingRequestsSearch({ status: 'EXPIRED' })).toMatchObject({
            status: 'EXPIRED',
            statuses: undefined,
        });
        expect(parseAdminBookingRequestsSearch({ statuses: ['CANCELED'] })).toMatchObject({
            status: 'CANCELED',
            statuses: undefined,
        });
    });

    it('keeps the open-for-review pair used by the admin home queue', () => {
        const search = parseAdminBookingRequestsSearch({
            publicationStatus: 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW',
            statuses: ['OFFERS_WAITING_FOR_REVIEW', 'WAITING_FOR_OFFERS'],
        });

        expect(search.publicationStatus).toBe('PUBLICATION_BLOCKED_BY_ADMIN_REVIEW');
        expect(search.status).toBeUndefined();
        expect(search.statuses).toEqual(['OFFERS_WAITING_FOR_REVIEW', 'WAITING_FOR_OFFERS']);
        expect(adminBookingRequestsPageVariables(search).criterion.statuses).toEqual(['OFFERS_WAITING_FOR_REVIEW', 'WAITING_FOR_OFFERS']);
    });

    it('accepts the open-for-review pair as a comma-separated string', () => {
        const search = parseAdminBookingRequestsSearch({
            statuses: 'WAITING_FOR_OFFERS,OFFERS_WAITING_FOR_REVIEW',
        });

        expect(search.statuses).toEqual(['WAITING_FOR_OFFERS', 'OFFERS_WAITING_FOR_REVIEW']);
    });

    it('ignores unknown status values', () => {
        expect(parseAdminBookingRequestsSearch({ status: 'NOPE', statuses: 'EXPIRED,NOPE' })).toMatchObject({
            status: 'EXPIRED',
            statuses: undefined,
        });
    });

    it('keeps a valid promoCodeId and drops invalid ids', () => {
        const promoCodeId = 'abcdefghijklmnopqrst';
        expect(parseAdminBookingRequestsSearch({ promoCodeId })).toMatchObject({ promoCodeId });
        expect(parseAdminBookingRequestsSearch({ promoCodeId: 'not-a-nano-id' }).promoCodeId).toBeUndefined();
        expect(adminBookingRequestsPageVariables({ promoCodeId }).criterion.promoCodeId).toBe(promoCodeId);
    });
});
