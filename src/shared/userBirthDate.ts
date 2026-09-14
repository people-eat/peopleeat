import { formatIsoDate } from './formatIsoDate';

/** Minimum age (years) for any user on the platform. */
export const USER_MINIMUM_AGE_YEARS = 18;

/** Earliest year offered in birth-date pickers. */
const USER_BIRTH_DATE_START_YEAR = 1920;

/** Default month shown when a birth-date picker opens empty. */
const USER_BIRTH_DATE_DEFAULT_MONTH = new Date(2000, 0, 1);

function parseIsoDateLocal(isoDate: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
    if (!match) {
        throw new Error(`userBirthDate: invalid ISO date "${isoDate}"`);
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return new Date(year, month - 1, day);
}

function toComparableDate(birthDate: string | Date): Date {
    return typeof birthDate === 'string' ? parseIsoDateLocal(birthDate) : birthDate;
}

/** Latest calendar day someone may have been born to meet {@link USER_MINIMUM_AGE_YEARS}. */
export function userBirthDateMaximum(referenceDate: Date = new Date()): Date {
    return new Date(referenceDate.getFullYear() - USER_MINIMUM_AGE_YEARS, referenceDate.getMonth(), referenceDate.getDate());
}

export function userBirthDateMeetsMinimumAge(birthDate: string | Date, referenceDate: Date = new Date()): boolean {
    return formatIsoDate(toComparableDate(birthDate)) <= formatIsoDate(userBirthDateMaximum(referenceDate));
}

export function userBirthDateAssertMinimumAge(birthDate: string | Date, errorPrefix: string, referenceDate: Date = new Date()): void {
    if (!userBirthDateMeetsMinimumAge(birthDate, referenceDate)) {
        throw new Error(`${errorPrefix}: birthDate must be at least ${USER_MINIMUM_AGE_YEARS} years ago`);
    }
}

/** Shared DatePicker bounds for birth-date inputs (start / end / default / disabled-after). */
export function userBirthDatePickerBounds(referenceDate: Date = new Date()) {
    const endMonth = userBirthDateMaximum(referenceDate);
    return {
        startMonth: new Date(USER_BIRTH_DATE_START_YEAR, 0, 1),
        endMonth,
        defaultMonth: USER_BIRTH_DATE_DEFAULT_MONTH,
        disabledAfter: endMonth,
    };
}
