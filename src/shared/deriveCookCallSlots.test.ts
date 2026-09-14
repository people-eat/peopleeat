import { describe, expect, it } from 'vitest';

import { COOK_CALL_AVAILABILITY_TIME_ZONE, deriveCookCallSlots, zonedMidnightToUtc } from './deriveCookCallSlots';

describe('deriveCookCallSlots', () => {
    it('slices Berlin weekday windows into duration slots and skips past/colliding', () => {
        // Monday 2026-09-21 in Berlin
        const monday = zonedMidnightToUtc('2026-09-21', COOK_CALL_AVAILABILITY_TIME_ZONE);
        const from = monday;
        const to = new Date(monday.getTime() + 24 * 60 * MS_PER_MINUTE);
        // Fixed "now" early Monday so morning slots are free
        const now = new Date(monday.getTime() + 7 * 60 * MS_PER_MINUTE);

        const slots = deriveCookCallSlots({
            callDurationMinutes: 30,
            rules: [{ dayOfWeek: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 11 * 60 }],
            exceptions: [],
            bookings: [],
            from,
            to,
            now,
            timeZone: COOK_CALL_AVAILABILITY_TIME_ZONE,
        });

        expect(slots).toHaveLength(4);
        expect(slots[0]!.startAt.getTime()).toBe(monday.getTime() + 9 * 60 * MS_PER_MINUTE);
        expect(slots[0]!.endAt.getTime()).toBe(monday.getTime() + 9.5 * 60 * MS_PER_MINUTE);
    });

    it('subtracts BLOCK exceptions and adds OPEN windows', () => {
        const monday = zonedMidnightToUtc('2026-09-21', COOK_CALL_AVAILABILITY_TIME_ZONE);
        const from = monday;
        const to = new Date(monday.getTime() + 24 * 60 * MS_PER_MINUTE);
        const now = new Date(monday.getTime() + 7 * 60 * MS_PER_MINUTE);

        const slots = deriveCookCallSlots({
            callDurationMinutes: 60,
            rules: [{ dayOfWeek: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 12 * 60 }],
            exceptions: [
                {
                    date: '2026-09-21',
                    type: 'BLOCK',
                    startMinuteOfDay: 10 * 60,
                    endMinuteOfDay: 11 * 60,
                },
            ],
            bookings: [],
            from,
            to,
            now,
        });

        expect(slots.map((s) => s.startAt.getTime())).toEqual([
            monday.getTime() + 9 * 60 * MS_PER_MINUTE,
            monday.getTime() + 11 * 60 * MS_PER_MINUTE,
        ]);
    });

    it('omits slots overlapping PENDING or CONFIRMED bookings', () => {
        const monday = zonedMidnightToUtc('2026-09-21', COOK_CALL_AVAILABILITY_TIME_ZONE);
        const from = monday;
        const to = new Date(monday.getTime() + 24 * 60 * MS_PER_MINUTE);
        const now = new Date(monday.getTime() + 7 * 60 * MS_PER_MINUTE);
        const startAt = new Date(monday.getTime() + 9 * 60 * MS_PER_MINUTE);
        const endAt = new Date(monday.getTime() + 9.5 * 60 * MS_PER_MINUTE);

        const slots = deriveCookCallSlots({
            callDurationMinutes: 30,
            rules: [{ dayOfWeek: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 10 * 60 }],
            exceptions: [],
            bookings: [{ startAt, endAt, status: 'CONFIRMED' }],
            from,
            to,
            now,
        });

        expect(slots).toHaveLength(1);
        expect(slots[0]!.startAt.getTime()).toBe(monday.getTime() + 9.5 * 60 * MS_PER_MINUTE);
    });
});

const MS_PER_MINUTE = 60_000;
