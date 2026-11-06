import { describe, expect, it } from 'vitest';

import {
    bookingRequestSettingChoiceFromStored,
    bookingRequestSettingChoiceParse,
    bookingRequestSettingFromChoice,
    bookingRequestSettingLabel,
    bookingRequestSettings,
    isBookingRequestSetting,
} from './bookingRequestSetting';

describe('bookingRequestSetting', () => {
    it('exposes the stored indoor/outdoor enum', () => {
        expect(bookingRequestSettings).toEqual(['INDOOR', 'OUTDOOR']);
        expect(isBookingRequestSetting('INDOOR')).toBe(true);
        expect(isBookingRequestSetting('LATER')).toBe(false);
    });

    it('parses indoor, outdoor, and later and rejects sentinels', () => {
        expect(bookingRequestSettingChoiceParse('INDOOR')).toBe('INDOOR');
        expect(bookingRequestSettingChoiceParse('OUTDOOR')).toBe('OUTDOOR');
        expect(bookingRequestSettingChoiceParse('LATER')).toBe('LATER');
        expect(bookingRequestSettingChoiceParse('UNSPECIFIED')).toBeUndefined();
        expect(bookingRequestSettingChoiceParse(null)).toBeUndefined();
    });

    it('persists only indoor and outdoor; later and skip become null', () => {
        expect(bookingRequestSettingFromChoice('INDOOR')).toBe('INDOOR');
        expect(bookingRequestSettingFromChoice('OUTDOOR')).toBe('OUTDOOR');
        expect(bookingRequestSettingFromChoice('LATER')).toBeNull();
        expect(bookingRequestSettingFromChoice(null)).toBeNull();
        expect(bookingRequestSettingChoiceFromStored('INDOOR')).toBe('INDOOR');
        expect(bookingRequestSettingChoiceFromStored(null)).toBeNull();
    });

    it('labels indoor and outdoor in both locales', () => {
        expect(bookingRequestSettingLabel('OUTDOOR', 'de')).toBe('Draußen');
        expect(bookingRequestSettingLabel('INDOOR', 'en')).toBe('Indoor');
    });
});
