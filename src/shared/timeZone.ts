import { toStripeCountryCode } from './toStripeCountryCode';

/** Marketplace default IANA zone (DE). Used as DB default and anonymous SSR fallback. */
export const DEFAULT_TIME_ZONE = 'Europe/Berlin';

/**
 * Representative IANA zone per ISO 3166-1 alpha-2. DACH shares CET/CEST.
 * Multi-zone countries use a capital / eastern representative (v1; lat/lng lookup later).
 */
const COUNTRY_TIME_ZONES: Record<string, string> = {
    AE: 'Asia/Dubai',
    AR: 'America/Argentina/Buenos_Aires',
    AT: 'Europe/Vienna',
    AU: 'Australia/Sydney',
    BE: 'Europe/Brussels',
    BG: 'Europe/Sofia',
    BR: 'America/Sao_Paulo',
    CA: 'America/Toronto',
    CH: 'Europe/Zurich',
    CN: 'Asia/Shanghai',
    CZ: 'Europe/Prague',
    DE: 'Europe/Berlin',
    DK: 'Europe/Copenhagen',
    ES: 'Europe/Madrid',
    FI: 'Europe/Helsinki',
    FR: 'Europe/Paris',
    GB: 'Europe/London',
    GR: 'Europe/Athens',
    HR: 'Europe/Zagreb',
    HU: 'Europe/Budapest',
    IE: 'Europe/Dublin',
    IL: 'Asia/Jerusalem',
    IN: 'Asia/Kolkata',
    IT: 'Europe/Rome',
    JP: 'Asia/Tokyo',
    LI: 'Europe/Vaduz',
    LU: 'Europe/Luxembourg',
    MX: 'America/Mexico_City',
    NL: 'Europe/Amsterdam',
    NO: 'Europe/Oslo',
    NZ: 'Pacific/Auckland',
    PL: 'Europe/Warsaw',
    PT: 'Europe/Lisbon',
    RO: 'Europe/Bucharest',
    SE: 'Europe/Stockholm',
    SI: 'Europe/Ljubljana',
    SK: 'Europe/Bratislava',
    TR: 'Europe/Istanbul',
    US: 'America/New_York',
    ZA: 'Africa/Johannesburg',
};

function parseInstant(value: string | Date): Date | null {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/** UTC offset in minutes east of UTC at `instant` (DST-aware). Invalid zones fall back to Berlin. */
export function timeZoneOffsetAt(instant: string | Date, timeZone: string): number {
    const date = parseInstant(instant);
    if (!date) return 0;

    const zone = timeZone.trim().length > 0 ? timeZone : DEFAULT_TIME_ZONE;
    try {
        return offsetMinutesAt(date, zone);
    } catch {
        return offsetMinutesAt(date, DEFAULT_TIME_ZONE);
    }
}

function offsetMinutesAt(date: Date, timeZone: string): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).formatToParts(date);
    const valueByType = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    const asUtc = Date.UTC(
        Number(valueByType.year),
        Number(valueByType.month) - 1,
        Number(valueByType.day),
        Number(valueByType.hour),
        Number(valueByType.minute),
        Number(valueByType.second),
    );
    return (asUtc - date.getTime()) / 60_000;
}

/** True when the two IANA zones show a different UTC offset at `instant`. */
export function timeZonesDifferAt(instant: string | Date, timeZoneA: string, timeZoneB: string): boolean {
    return timeZoneOffsetAt(instant, timeZoneA) !== timeZoneOffsetAt(instant, timeZoneB);
}

/**
 * Venue wall-clock zone from a Places country (ISO alpha-2 or a long name).
 * Unknown countries fall back to {@link DEFAULT_TIME_ZONE}.
 */
export function timeZoneFromCountry(country: string | null | undefined): string {
    const code = toStripeCountryCode(country ?? '');
    if (code.length === 0) return DEFAULT_TIME_ZONE;
    return COUNTRY_TIME_ZONES[code] ?? DEFAULT_TIME_ZONE;
}

/** City-style label from an IANA id (`America/New_York` → `New York`). Never the raw id. */
export function formatTimeZonePlaceLabel(timeZone: string): string {
    const trimmed = timeZone.trim();
    if (trimmed.length === 0) return '';
    const city = trimmed.split('/').pop() ?? trimmed;
    return city.replaceAll('_', ' ');
}
