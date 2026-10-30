import { describe, expect, it } from 'vitest';

import { bookingRequestStatusHue, bookingRequestStatusLabel } from './bookingRequestStatus';

describe('bookingRequestStatusLabel', () => {
    it('confirms to customers what admins see as an outstanding payment pull', () => {
        // Arrange
        const status = 'PAYMENT_PULL_PENDING';

        // Act
        const labels = [bookingRequestStatusLabel(status, 'de', 'customer'), bookingRequestStatusLabel(status, 'de', 'admin')];

        // Assert
        expect(labels).toEqual(['Bestätigt', 'Zahlungseinzug ausstehend']);
    });
});

describe('bookingRequestStatusHue', () => {
    it('groups request outcomes into lifecycle hues', () => {
        // Arrange
        const statuses = [
            'WAITING_FOR_OFFERS',
            'OFFERS_WAITING_FOR_REVIEW',
            'DEPOSIT_PAYMENT_PENDING',
            'EVENT_PENDING',
            'EXPIRED',
        ] as const;

        // Act
        const hues = statuses.map(bookingRequestStatusHue);

        // Assert
        expect(hues).toEqual(['yellow', 'blue', 'purple', 'green', 'red']);
    });
});
