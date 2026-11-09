import { describe, expect, it } from 'vitest';

import { bookingEventCalendarIcs } from './calendarEventContent';

describe('bookingEventCalendarIcs', () => {
    it('spans four hours from the start and reminds the day before', () => {
        const ics = bookingEventCalendarIcs({
            locale: 'en',
            timeZone: 'Europe/Berlin',
            occasion: 'Dinner',
            peerName: 'Ada',
            guestCount: 6,
            start: new Date('2030-06-15T16:00:00.000Z'),
            location: 'Street 1, Berlin',
            bookingUrl: 'https://people-eat.com/profile/booking-requests/req-1',
            bookingRequestId: 'req-1',
            stampedAt: new Date('2030-06-01T12:00:00.000Z'),
        });

        expect(ics).toContain('DTSTART:20300615T160000Z');
        expect(ics).toContain('DTEND:20300615T200000Z');
        expect(ics).toContain('TRIGGER:-PT1440M');
        expect(ics).toContain('SUMMARY:Dinner with Ada');
        expect(ics).toContain('UID:booking-request-req-1@peopleeat');
        expect(ics).toContain('Starts at 6:00 PM in Berlin');
    });
});
