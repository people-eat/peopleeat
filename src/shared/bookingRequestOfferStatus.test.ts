import { describe, expect, it } from 'vitest';

import { bookingRequestOfferStatusHue, bookingRequestOfferStatusLabel } from './bookingRequestOfferStatus';

describe('bookingRequestOfferStatusLabel', () => {
    it('words the same status per audience', () => {
        // Arrange
        const status = 'USER_NEEDS_DEPOSIT_PAYMENT';

        // Act
        const labels = (['customer', 'cook', 'admin'] as const).map((audience) => bookingRequestOfferStatusLabel(status, 'en', audience));

        // Assert
        expect(labels).toEqual(['Provide payment data', 'Confirmed', 'Customer needs to provide payment data']);
    });
});

describe('bookingRequestOfferStatusHue', () => {
    it('groups offer outcomes into lifecycle hues', () => {
        // Arrange
        const statuses = ['USER_NEEDS_TO_ACCEPT', 'COOK_NEEDS_TO_ACCEPT', 'EVENT_PENDING', 'COMPLETED', 'COOK_DECLINED'] as const;

        // Act
        const hues = statuses.map(bookingRequestOfferStatusHue);

        // Assert
        expect(hues).toEqual(['blue', 'yellow', 'green', 'purple', 'red']);
    });
});
