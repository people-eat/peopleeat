import { describe, expect, it } from 'vitest';

import {
    USER_MINIMUM_AGE_YEARS,
    userBirthDateAssertMinimumAge,
    userBirthDateMaximum,
    userBirthDateMeetsMinimumAge,
    userBirthDatePickerBounds,
} from './userBirthDate';

describe('userBirthDate', () => {
    it('computes the latest allowed birth date from the reference day', () => {
        expect(userBirthDateMaximum(new Date(2026, 8, 24))).toEqual(new Date(2008, 8, 24));
    });

    it('accepts the birthday that turns the person exactly the minimum age', () => {
        const today = new Date(2026, 8, 24);
        expect(userBirthDateMeetsMinimumAge('2008-09-24', today)).toBe(true);
        expect(userBirthDateMeetsMinimumAge(new Date(2008, 8, 24), today)).toBe(true);
    });

    it('rejects a birth date one day too recent', () => {
        const today = new Date(2026, 8, 24);
        expect(userBirthDateMeetsMinimumAge('2008-09-25', today)).toBe(false);
    });

    it('assert throws with the command prefix when under age', () => {
        expect(() => userBirthDateAssertMinimumAge('2015-01-01', 'userCreate', new Date(2026, 0, 1))).toThrow(
            `userCreate: birthDate must be at least ${USER_MINIMUM_AGE_YEARS} years ago`,
        );
    });

    it('picker bounds end on the maximum birth date', () => {
        const today = new Date(2026, 8, 24);
        const bounds = userBirthDatePickerBounds(today);
        expect(bounds.endMonth).toEqual(new Date(2008, 8, 24));
        expect(bounds.disabledAfter).toEqual(bounds.endMonth);
        expect(bounds.startMonth).toEqual(new Date(1920, 0, 1));
        expect(bounds.defaultMonth).toEqual(new Date(2000, 0, 1));
    });
});
