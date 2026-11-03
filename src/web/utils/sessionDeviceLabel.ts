import type { Locale } from '../../shared/locale';

const unknownDevice = { de: 'Unbekanntes Gerät', en: 'Unknown device' } as const;

const devicePhrases: { test: RegExp; de: string; en: string; preposition: 'auf' | 'unter' }[] = [
    { test: /iPhone/, de: 'dem iPhone', en: 'iPhone', preposition: 'auf' },
    { test: /iPad/, de: 'dem iPad', en: 'iPad', preposition: 'auf' },
    { test: /Android/, de: 'dem Android-Gerät', en: 'Android', preposition: 'auf' },
    { test: /Macintosh|Mac OS X/, de: 'dem Mac', en: 'Mac', preposition: 'auf' },
    { test: /Windows/, de: 'Windows', en: 'Windows', preposition: 'unter' },
    { test: /CrOS/, de: 'dem Chromebook', en: 'Chromebook', preposition: 'auf' },
    { test: /Linux/, de: 'Linux', en: 'Linux', preposition: 'unter' },
];

function browserName(userAgent: string): string | null {
    if (/Edg\//.test(userAgent) || /Edg.+OS/.test(userAgent)) return 'Edge';
    if (/OPR\/|Opera/.test(userAgent)) return 'Opera';
    if (/FxiOS|Firefox\//.test(userAgent)) return 'Firefox';
    if (/CriOS|Chrome\//.test(userAgent)) return 'Chrome';
    if (/Safari\//.test(userAgent)) return 'Safari';
    return null;
}

/** Everyday device name for the account page. Never returns the raw user agent. */
export function sessionDeviceLabel(userAgent: string | null | undefined, locale: Locale): string {
    const trimmed = userAgent?.trim();
    if (!trimmed) return unknownDevice[locale];

    const browser = browserName(trimmed);
    const device = devicePhrases.find((entry) => entry.test.test(trimmed));
    if (browser && device) {
        return locale === 'de' ? `${browser} ${device.preposition} ${device.de}` : `${browser} on ${device.en}`;
    }
    if (browser) return browser;
    if (device) return locale === 'de' ? device.de.replace(/^dem /, '') : device.en;
    return unknownDevice[locale];
}
