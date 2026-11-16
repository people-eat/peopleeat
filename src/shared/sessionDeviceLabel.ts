import { t } from '../i18n/t';
import type { Locale } from './locale';

type DeviceKey = 'iphone' | 'ipad' | 'android' | 'mac' | 'windows' | 'chromebook' | 'linux';
type DevicePreposition = 'auf' | 'unter';

const devicePhrases: { test: RegExp; key: DeviceKey; preposition: DevicePreposition }[] = [
    { test: /iPhone/, key: 'iphone', preposition: 'auf' },
    { test: /iPad/, key: 'ipad', preposition: 'auf' },
    { test: /Android/, key: 'android', preposition: 'auf' },
    { test: /Macintosh|Mac OS X/, key: 'mac', preposition: 'auf' },
    { test: /Windows/, key: 'windows', preposition: 'unter' },
    { test: /CrOS/, key: 'chromebook', preposition: 'auf' },
    { test: /Linux/, key: 'linux', preposition: 'unter' },
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
    if (!trimmed) return t(locale, 'common', 'sessionDevice.unknown');

    const browser = browserName(trimmed);
    const device = devicePhrases.find((entry) => entry.test.test(trimmed));
    if (browser && device) {
        return t(locale, 'common', 'sessionDevice.browserOnDevice', {
            browser,
            device: t(locale, 'common', `sessionDevice.device.${device.key}`),
            preposition: t(locale, 'common', `sessionDevice.preposition.${device.preposition}`),
        });
    }
    if (browser) return browser;
    if (device) return t(locale, 'common', `sessionDevice.device.${device.key}Bare`);
    return t(locale, 'common', 'sessionDevice.unknown');
}
