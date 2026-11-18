import { describe, expect, it } from 'vitest';

import { cookBiographyContactContains, cookBiographyContactStrip, cookBiographyNormalize } from './cookBiographyContact';

describe('cookBiographyContactContains', () => {
    it.each([
        ['Write me at chef@example.com'],
        ['https://chef-mueller.de'],
        ['www.chef-mueller.de/menu'],
        ['Visit chef-mueller.de for menus'],
        ['Instagram: chef'],
        ['IG: @chef'],
        ['Follow @chef'],
        ['Call +49 151 12345678'],
        ['mailto:chef@example.com'],
    ])('detects %s', (text) => {
        expect(cookBiographyContactContains(text)).toBe(true);
    });

    it.each([
        ['Roland kochte in Mallorca und Hamburg.'],
        ['Stationen in 4*-Hotels'],
        ['We cook for 6 people at 19:00'],
        ['Saisonal, z.B. Kräuter aus der Region'],
        ['Ausbildung 2018 bis 2024'],
    ])('does not flag %s', (text) => {
        expect(cookBiographyContactContains(text)).toBe(false);
    });
});

describe('cookBiographyContactStrip', () => {
    it('cuts emails, links, Instagram, and phone numbers and keeps the story', () => {
        expect(cookBiographyContactStrip('Roland kocht in Mallorca. chef@example.com')).toBe('Roland kocht in Mallorca.');
        expect(cookBiographyContactStrip('Visit https://chef.de, then book.')).toBe('Visit, then book.');
        expect(cookBiographyContactStrip('Follow @chef on quiet Sundays.')).toBe('Follow on quiet Sundays.');
        expect(cookBiographyContactStrip('IG: chef and lots of travel.')).toBe('and lots of travel.');
        expect(cookBiographyContactStrip('Call +49 151 12345678 please.')).toBe('Call please.');
    });

    it('leaves spelled-out phone numbers for the LLM', () => {
        const text = 'Ruf mich unter null eins fünf zwei an.';
        expect(cookBiographyContactStrip(text)).toBe(text);
        expect(cookBiographyContactContains(text)).toBe(false);
    });

    it('is a no-op when nothing matches', () => {
        const text = 'Roland kochte in einem 4*-Hotel in Saalbach.';
        expect(cookBiographyContactStrip(text)).toBe(text);
    });
});

describe('cookBiographyNormalize', () => {
    it('normalizes prose and strips contact', () => {
        expect(cookBiographyNormalize('  Roland   kocht.\n\n\nchef@example.com  ')).toBe('Roland kocht.');
    });
});
