import { describe, expect, it } from 'vitest';

import {
    COOK_TRAVEL_DISTANCE_SELECT_DEFAULT_KM,
    COOK_TRAVEL_DISTANCE_SELECT_OPTIONS_KM,
    cookTravelDistanceSelectOptions,
    cookTravelDistanceSelectValue,
} from './cookTravelDistance';

describe('cookTravelDistanceSelectValue', () => {
    it('stringifies a saved distance', () => {
        expect(cookTravelDistanceSelectValue(80)).toBe('80');
        expect(cookTravelDistanceSelectValue(100)).toBe('100');
    });

    it('falls back when unset', () => {
        expect(cookTravelDistanceSelectValue(null)).toBe(String(COOK_TRAVEL_DISTANCE_SELECT_DEFAULT_KM));
        expect(cookTravelDistanceSelectValue(undefined)).toBe(String(COOK_TRAVEL_DISTANCE_SELECT_DEFAULT_KM));
    });
});

describe('cookTravelDistanceSelectOptions', () => {
    it('returns the standard choices by default', () => {
        expect(cookTravelDistanceSelectOptions()).toEqual(COOK_TRAVEL_DISTANCE_SELECT_OPTIONS_KM.map(String));
        expect(cookTravelDistanceSelectOptions(100)).toEqual(COOK_TRAVEL_DISTANCE_SELECT_OPTIONS_KM.map(String));
    });

    it('includes a legacy saved distance so the select can show it', () => {
        expect(cookTravelDistanceSelectOptions(80)).toEqual(['50', '80', '100', '150', '200']);
        expect(cookTravelDistanceSelectOptions(250)).toEqual(['50', '100', '150', '200', '250']);
    });
});
