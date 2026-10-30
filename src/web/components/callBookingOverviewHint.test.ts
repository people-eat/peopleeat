import { describe, expect, it } from 'vitest';

import { DEFAULT_TIME_ZONE } from '../../shared';
import { callBookingOverviewHint, callBookingOverviewHintAcrossOffers } from './callBookingOverviewHint';
import type { CallBookingOverviewItem } from './callBookingOverviewHint';

function booking(overrides: Partial<CallBookingOverviewItem>): CallBookingOverviewItem {
    return {
        cookCallSlotBookingId: 'call-1',
        startAt: '2099-06-01T16:00:00.000Z',
        endAt: '2099-06-01T16:15:00.000Z',
        status: 'PENDING',
        initiator: 'COOK',
        ...overrides,
    };
}

describe('callBookingOverviewHint', () => {
    it('prefers the incoming pending call over outgoing pending and confirmed', () => {
        // Arrange
        const confirmed = booking({ cookCallSlotBookingId: 'confirmed', status: 'CONFIRMED', initiator: 'CUSTOMER' });
        const outgoing = booking({ cookCallSlotBookingId: 'outgoing', initiator: 'CUSTOMER' });
        const incoming = booking({ cookCallSlotBookingId: 'incoming', initiator: 'COOK' });

        // Act
        const hint = callBookingOverviewHint([confirmed, outgoing, incoming], 'customer', 'en', DEFAULT_TIME_ZONE);

        // Assert
        expect(hint?.booking.cookCallSlotBookingId).toBe('incoming');
        expect(hint?.label).toMatch(/^Call suggestion awaiting your response · /);
        expect(hint?.openCall).toBe(true);
    });

    it('treats customer-initiated pending calls as incoming for the cook', () => {
        // Arrange
        const customerRequest = booking({ initiator: 'CUSTOMER' });

        // Act
        const hint = callBookingOverviewHint([customerRequest], 'cook', 'de', DEFAULT_TIME_ZONE);

        // Assert
        expect(hint?.label).toMatch(/^Terminanfrage wartet auf dich · /);
    });

    it('falls back to outgoing pending, then confirmed', () => {
        // Arrange
        const outgoing = booking({ initiator: 'CUSTOMER' });
        const confirmed = booking({ status: 'CONFIRMED' });

        // Act
        const outgoingHint = callBookingOverviewHint([outgoing], 'customer', 'en', DEFAULT_TIME_ZONE);
        const confirmedHint = callBookingOverviewHint([confirmed], 'customer', 'en', DEFAULT_TIME_ZONE);

        // Assert
        expect(outgoingHint?.label).toMatch(/^Call request pending · /);
        expect(confirmedHint?.label).toMatch(/^Discovery call confirmed · /);
    });

    it('uses neutral wording for admins and ignores declined or canceled calls', () => {
        // Arrange
        const awaitingCustomer = booking({ initiator: 'COOK' });
        const declined = booking({ status: 'DECLINED' });
        const canceled = booking({ status: 'CANCELED' });

        // Act
        const adminHint = callBookingOverviewHint([awaitingCustomer], 'admin', 'en', DEFAULT_TIME_ZONE);
        const noHint = callBookingOverviewHint([declined, canceled], 'customer', 'en', DEFAULT_TIME_ZONE);

        // Assert
        expect(adminHint?.label).toMatch(/^Call suggestion awaiting customer · /);
        expect(noHint).toBeNull();
    });
});

describe('callBookingOverviewHintAcrossOffers', () => {
    it('picks the offer with a call awaiting the customer over pending and confirmed ones', () => {
        // Arrange
        const offers = [
            { bookingRequestOfferId: 'offer-confirmed', callBookings: [booking({ status: 'CONFIRMED' })] },
            { bookingRequestOfferId: 'offer-outgoing', callBookings: [booking({ initiator: 'CUSTOMER' })] },
            { bookingRequestOfferId: 'offer-incoming', callBookings: [booking({ initiator: 'COOK' })] },
        ];

        // Act
        const hint = callBookingOverviewHintAcrossOffers(offers, 'en', DEFAULT_TIME_ZONE);

        // Assert
        expect(hint?.bookingRequestOfferId).toBe('offer-incoming');
    });
});
