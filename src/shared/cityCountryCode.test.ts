import { describe, expect, it } from 'vitest';

import {
    cityCountryCitiesHeading,
    cityCountryCodeAssert,
    cityCountryCodeLabel,
    cityCountryHubLinkLabel,
    cityCountryHubPath,
    isCityCountryCode,
} from './cityCountryCode';

describe('cityCountryCode', () => {
    it('accepts DE NL CH only', () => {
        expect(isCityCountryCode('DE')).toBe(true);
        expect(isCityCountryCode('nl')).toBe(false);
        expect(cityCountryCodeAssert(' ch ', 'test')).toBe('CH');
        expect(() => cityCountryCodeAssert('AT', 'test')).toThrow(/invalid city country code/);
    });

    it('labels and hubs for SEO chrome', () => {
        expect(cityCountryCodeLabel('NL', 'en')).toBe('the Netherlands');
        expect(cityCountryHubPath('DE')).toBe('/cities');
        expect(cityCountryHubPath('NL')).toBe('/coming-to/netherlands');
        expect(cityCountryHubPath('CH')).toBe('/coming-to/switzerland');
        expect(cityCountryHubLinkLabel('DE', 'de')).toBe('Alle Städte');
        expect(cityCountryHubLinkLabel('CH', 'en')).toBe('Switzerland');
        expect(cityCountryCitiesHeading('NL', 'de')).toBe('Städte in den Niederlanden');
    });
});
