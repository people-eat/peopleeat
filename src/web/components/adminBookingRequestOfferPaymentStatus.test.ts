import { describe, expect, it } from 'vitest';

import {
    adminBookingRequestOfferPaymentStatusDescription,
    adminBookingRequestOfferPlannedPullPastNote,
} from './adminBookingRequestOfferPaymentStatus';

describe('adminBookingRequestOfferPaymentStatusDescription', () => {
    it('uses overdue wording for SETUP when the planned pull is past', () => {
        expect(
            adminBookingRequestOfferPaymentStatusDescription('SETUP', 'en', {
                plannedPaymentPullDateTime: '2020-01-01T00:00:00.000Z',
            }),
        ).toContain('planned pull date is past');
    });

    it('keeps the scheduled wording for SETUP when the planned pull is still ahead', () => {
        expect(
            adminBookingRequestOfferPaymentStatusDescription('SETUP', 'en', {
                plannedPaymentPullDateTime: '2099-01-01T00:00:00.000Z',
            }),
        ).toContain('planned pull date');
    });
});

describe('adminBookingRequestOfferPlannedPullPastNote', () => {
    it('explains EMPTY and SETUP overdue pulls', () => {
        expect(adminBookingRequestOfferPlannedPullPastNote('EMPTY', 'en')).toContain('right after');
        expect(adminBookingRequestOfferPlannedPullPastNote('SETUP', 'en')).toContain('shortly');
    });

    it('returns null once money is already collected', () => {
        expect(adminBookingRequestOfferPlannedPullPastNote('PAYED', 'en')).toBeNull();
    });
});
