import { describe, expect, it } from 'vitest';

import {
    cookCallSlotBookingNextStepIsBefore,
    cookCallSlotBookingNextStepPick,
    cookCallSlotBookingStatusLabel,
    cookCallSlotBookingStatusTone,
} from './cookCallSlotBookingStatus';

describe('cookCallSlotBookingNextStepPick', () => {
    it('prefers the call the audience must answer, then their own request, then a confirmed call', () => {
        // Arrange
        const confirmed = { id: 'confirmed', status: 'CONFIRMED', initiator: 'COOK' };
        const fromCustomer = { id: 'from-customer', status: 'PENDING', initiator: 'CUSTOMER' };
        const fromCook = { id: 'from-cook', status: 'PENDING', initiator: 'COOK' };
        const bookings = [confirmed, fromCustomer, fromCook];

        // Act
        const forCustomer = cookCallSlotBookingNextStepPick(bookings, 'customer');
        const forCook = cookCallSlotBookingNextStepPick(bookings, 'cook');
        const onlyConfirmed = cookCallSlotBookingNextStepPick([confirmed], 'cook');

        // Assert
        expect(forCustomer).toEqual({ booking: fromCook, step: 'RESPONSE_NEEDED' });
        expect(forCook).toEqual({ booking: fromCustomer, step: 'RESPONSE_NEEDED' });
        expect(onlyConfirmed).toEqual({ booking: confirmed, step: 'CONFIRMED' });
    });

    it('ignores settled calls that need no further action', () => {
        // Arrange
        const bookings = [
            { status: 'DECLINED', initiator: 'COOK' },
            { status: 'CANCELED', initiator: 'CUSTOMER' },
            { status: 'COMPLETED', initiator: 'COOK' },
        ];

        // Act
        const picked = cookCallSlotBookingNextStepPick(bookings, 'customer');

        // Assert
        expect(picked).toBeNull();
    });
});

describe('cookCallSlotBookingNextStepIsBefore', () => {
    it('ranks any step before none and keeps ties stable', () => {
        // Assert
        expect(cookCallSlotBookingNextStepIsBefore('CONFIRMED', null)).toBe(true);
        expect(cookCallSlotBookingNextStepIsBefore('RESPONSE_NEEDED', 'PENDING')).toBe(true);
        expect(cookCallSlotBookingNextStepIsBefore('PENDING', 'PENDING')).toBe(false);
    });
});

describe('cookCallSlotBookingStatusLabel', () => {
    it('asks the customer to respond when the cook proposed the slot', () => {
        // Arrange
        const booking = { status: 'PENDING', initiator: 'COOK' } as const;

        // Act
        const label = cookCallSlotBookingStatusLabel(booking, 'customer', 'en');

        // Assert
        expect(label).toBe('Awaiting your response');
    });

    it('tells the customer to wait when they proposed the slot', () => {
        // Arrange
        const booking = { status: 'PENDING', initiator: 'CUSTOMER' } as const;

        // Act
        const label = cookCallSlotBookingStatusLabel(booking, 'customer', 'de');

        // Assert
        expect(label).toBe('Warte auf Bestätigung');
    });

    it('asks the cook to respond when the customer proposed the slot', () => {
        // Arrange
        const booking = { status: 'PENDING', initiator: 'CUSTOMER' } as const;

        // Act
        const label = cookCallSlotBookingStatusLabel(booking, 'cook', 'en');

        // Assert
        expect(label).toBe('Awaiting your response');
    });

    it('names the waiting party for admins', () => {
        // Arrange
        const fromCook = { status: 'PENDING', initiator: 'COOK' } as const;
        const fromCustomer = { status: 'PENDING', initiator: 'CUSTOMER' } as const;

        // Act
        const labels = [
            cookCallSlotBookingStatusLabel(fromCook, 'admin', 'en'),
            cookCallSlotBookingStatusLabel(fromCustomer, 'admin', 'en'),
        ];

        // Assert
        expect(labels).toEqual(['Awaiting customer', 'Awaiting chef']);
    });

    it('uses the same wording for every audience once the slot is settled', () => {
        // Arrange
        const booking = { status: 'CONFIRMED', initiator: 'COOK' } as const;

        // Act
        const labels = (['customer', 'cook', 'admin'] as const).map((audience) => cookCallSlotBookingStatusLabel(booking, audience, 'de'));

        // Assert
        expect(new Set(labels)).toEqual(new Set(['Bestätigt']));
    });
});

describe('cookCallSlotBookingStatusTone', () => {
    it('warns only the party that has to respond to a pending slot', () => {
        // Arrange
        const booking = { status: 'PENDING', initiator: 'CUSTOMER' } as const;

        // Act
        const tones = {
            customer: cookCallSlotBookingStatusTone(booking, 'customer'),
            cook: cookCallSlotBookingStatusTone(booking, 'cook'),
            admin: cookCallSlotBookingStatusTone(booking, 'admin'),
        };

        // Assert
        expect(tones).toEqual({ customer: 'info', cook: 'warning', admin: 'warning' });
    });

    it('maps settled outcomes to success or error', () => {
        // Arrange
        const initiator = 'COOK' as const;

        // Act
        const tones = (['CONFIRMED', 'COMPLETED', 'DECLINED', 'CANCELED'] as const).map((status) =>
            cookCallSlotBookingStatusTone({ status, initiator }, 'cook'),
        );

        // Assert
        expect(tones).toEqual(['success', 'success', 'error', 'error']);
    });
});
