import { describe, expect, it } from 'vitest';

import { bookingRequestSuggestedOfferMessage } from './bookingRequestSuggestedOfferMessage';

describe('bookingRequestSuggestedOfferMessage', () => {
    it('returns German copy for de', () => {
        expect(bookingRequestSuggestedOfferMessage('de')).toContain('Vielen Dank');
    });

    it('returns English copy for en', () => {
        expect(bookingRequestSuggestedOfferMessage('en')).toContain('Thank you');
    });
});
