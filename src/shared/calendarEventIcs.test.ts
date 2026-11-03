import { describe, expect, it } from 'vitest';

import { calendarEventIcs } from './calendarEventIcs';

const start = new Date('2030-06-15T16:00:00.000Z');
const end = new Date('2030-06-15T16:30:00.000Z');
const stampedAt = new Date('2030-06-01T12:00:00.000Z');

describe('calendarEventIcs', () => {
    it('writes a UTC publish event with a trailing CRLF', () => {
        const ics = calendarEventIcs({
            start,
            end,
            title: 'Call with Ada',
            description: 'Intro call about dinner.',
            uid: 'slot-1@peopleeat',
            stampedAt,
        });
        expect(ics).toContain('METHOD:PUBLISH');
        expect(ics).toContain('DTSTART:20300615T160000Z');
        expect(ics).toContain('DTEND:20300615T163000Z');
        expect(ics).toContain('DTSTAMP:20300601T120000Z');
        expect(ics).toContain('UID:slot-1@peopleeat');
        expect(ics).toContain('STATUS:CONFIRMED');
        expect(ics.endsWith('\r\n')).toBe(true);
        expect(ics).not.toContain('BEGIN:VALARM');
    });

    it('escapes text and folds long lines at 75 octets', () => {
        const description = `Line one, with a comma.\n${'x'.repeat(120)}`;
        const ics = calendarEventIcs({
            start,
            end,
            title: 'Dinner; tonight',
            description,
            uid: 'event@peopleeat',
            location: 'Street 1, Berlin',
            url: `https://people-eat.com/${'p'.repeat(80)}`,
            alarmMinutesBefore: 15,
            stampedAt,
        });
        expect(ics).toContain('SUMMARY:Dinner\\; tonight');
        expect(ics).toContain('DESCRIPTION:Line one\\, with a comma.\\n');
        expect(ics).toContain('LOCATION:Street 1\\, Berlin');
        expect(ics).toContain('\r\n ');
        expect(ics).toContain('TRIGGER:-PT15M');
        for (const line of ics.split('\r\n')) {
            const octets = new TextEncoder().encode(line.startsWith(' ') ? line.slice(1) : line).length;
            const limit = line.startsWith(' ') ? 74 : 75;
            expect(octets).toBeLessThanOrEqual(limit);
        }
    });
});
