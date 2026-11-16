import { describe, expect, it } from 'vitest';

import { sessionDeviceLabel } from './sessionDeviceLabel';

describe('sessionDeviceLabel', () => {
    it('names Chrome on a Mac', () => {
        const userAgent =
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        expect(sessionDeviceLabel(userAgent, 'de')).toBe('Chrome auf dem Mac');
        expect(sessionDeviceLabel(userAgent, 'en')).toBe('Chrome on Mac');
    });

    it('names Safari on a Mac', () => {
        const userAgent =
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
        expect(sessionDeviceLabel(userAgent, 'en')).toBe('Safari on Mac');
    });

    it('names Chrome on an iPhone', () => {
        const userAgent =
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1';
        expect(sessionDeviceLabel(userAgent, 'de')).toBe('Chrome auf dem iPhone');
    });

    it('uses unter for Windows in German', () => {
        const userAgent =
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
        expect(sessionDeviceLabel(userAgent, 'en')).toBe('Edge on Windows');
        expect(sessionDeviceLabel(userAgent, 'de')).toBe('Edge unter Windows');
    });

    it('falls back to unknown for empty or obscure agents', () => {
        expect(sessionDeviceLabel(null, 'de')).toBe('Unbekanntes Gerät');
        expect(sessionDeviceLabel('  ', 'en')).toBe('Unknown device');
        expect(sessionDeviceLabel('curl/8.0', 'en')).toBe('Unknown device');
    });
});
