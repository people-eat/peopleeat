import { createHash } from 'node:crypto';

import type { BookingRequestFormFunnelStep } from '../../src/shared/bookingRequestFormFunnel';
import { bookingRequestFormFunnelArea } from '../../src/shared/bookingRequestFormFunnel';
import type { ContentSection } from '../../src/shared/contentSection';
import { pathNameSlugify } from '../../src/shared/contentSection';
import { idCreate, isNanoId } from '../../src/shared/idCreate';
import type { Locale } from '../../src/shared/locale';

/**
 * Predecessor booking-form Sankey matched `areaName` + click `key` (see
 * people-eat `adminAnalyticsBookingRequestFormFlowChart`). Map those pairs onto
 * peopleeat `step_completed` funnel steps. No `step_entered` is synthesized.
 */
const LEGACY_BOOKING_FORM_FUNNEL_CLICKS: ReadonlyMap<string, BookingRequestFormFunnelStep> = new Map([
    ['Occasion Selection\0Next', 'occasion'],
    ['Participants Selection\0Next', 'participants'],
    ['Location Selection\0Next', 'location'],
    ['Date and Time Selection\0Next', 'dateTime'],
    ['Price Class Selection\0Next', 'priceClass'],
    ['Preference Selection\0Next', 'preferences'],
    ['Restriction Selection\0Next', 'restrictions'],
    ['Additional Information\0Next', 'message'],
    ['Additional Information\0Send Booking request', 'message'],
    ['About Customer\0Send Booking request', 'auth'],
]);

export function localeFromLanguageCode(languageCode: string | null | undefined): Locale {
    const normalized = (languageCode ?? '').toLowerCase();
    if (normalized.startsWith('en')) return 'en';
    return 'de';
}

export function ipHashFromPlaintext(salt: string, ipAddress: string | null | undefined): string | null {
    if (!ipAddress) return null;
    return createHash('sha256').update(`${salt}:${ipAddress}`).digest('hex');
}

export function syntheticUserAgent(input: { clientType?: string | null; platform?: string | null; browser?: string | null }): string {
    return `peopleeat-import/1.0 (platform=${input.platform ?? 'UNKNOWN'}; browser=${input.browser ?? 'UNKNOWN'}; clientType=${input.clientType ?? 'UNKNOWN'})`;
}

export function invoiceAddressRename(
    address:
        | {
              businessName?: string | null;
              firstName: string;
              lastName: string;
              country: string;
              city: string;
              postCode: string;
              line1: string;
              line2: string;
          }
        | null
        | undefined,
): {
    companyName?: string | null;
    firstName: string;
    lastName: string;
    country: string;
    city: string;
    postalCode: string;
    line1: string;
    line2: string;
} | null {
    if (!address) return null;
    return {
        companyName: address.businessName ?? null,
        firstName: address.firstName,
        lastName: address.lastName,
        country: address.country,
        city: address.city,
        postalCode: address.postCode,
        line1: address.line1,
        line2: address.line2,
    };
}

type LegacySection = {
    sectionId?: string | null;
    kind?: string | null;
    imageId?: string | null;
    imageUrl?: string | null;
    title?: string | null;
    titleEnglish?: string | null;
    titleDe?: string | null;
    titleEn?: string | null;
    subtitle?: string | null;
    subtitleEnglish?: string | null;
    body?: string | null;
    bodyEnglish?: string | null;
    content?: string | null;
    contentEnglish?: string | null;
    quote?: string | null;
    quoteEnglish?: string | null;
    attribution?: string | null;
    attributionEnglish?: string | null;
    style?: string | null;
    items?: string[] | null;
    itemsEnglish?: string[] | null;
    headline?: string | null;
    headlineEnglish?: string | null;
    buttonLabel?: string | null;
    buttonLabelEnglish?: string | null;
    href?: string | null;
    imageFirst?: boolean | null;
    renderImageFirst?: boolean | null;
};

function sectionIdFromLegacy(section: LegacySection): string {
    const raw = section.sectionId?.trim();
    return raw && isNanoId(raw) ? raw : idCreate();
}

function textOrEmpty(value: string | null | undefined): string {
    return value ?? '';
}

/** Best-effort reshape of predecessor bilingual sections into ContentSection[]. */
export function contentSectionsFromLegacy(
    sections: LegacySection[] | null | undefined,
    imageIdToFileUploadId: (imageId: string) => string | null,
): { sections: ContentSection[]; leftovers: LegacySection[] } {
    if (!sections?.length) return { sections: [], leftovers: [] };

    const mapped: ContentSection[] = [];
    const leftovers: LegacySection[] = [];

    for (const section of sections) {
        const kind = section.kind ?? null;
        const imageId = section.imageId ?? extractImageIdFromUrl(section.imageUrl);
        const imageFileUploadId = imageId ? imageIdToFileUploadId(imageId) : null;
        const sectionId = sectionIdFromLegacy(section);

        if (kind === 'image' || (!kind && imageFileUploadId && !textOrEmpty(section.content).trim() && !textOrEmpty(section.body).trim())) {
            if (!imageFileUploadId) {
                leftovers.push(section);
                continue;
            }
            mapped.push({ sectionId, kind: 'image', imageFileUploadId });
            continue;
        }

        if (kind === 'quote') {
            const quoteDe = textOrEmpty(section.quote).trim();
            if (!quoteDe) {
                leftovers.push(section);
                continue;
            }
            mapped.push({
                sectionId,
                kind: 'quote',
                quoteDe,
                quoteEn: textOrEmpty(section.quoteEnglish),
                attributionDe: section.attribution ?? null,
                attributionEn: section.attributionEnglish ?? null,
            });
            continue;
        }

        if (kind === 'list') {
            const itemsDe = (section.items ?? []).map((item) => String(item)).filter((item) => item.trim());
            if (itemsDe.length === 0) {
                leftovers.push(section);
                continue;
            }
            const style = section.style === 'NUMBERED' ? 'NUMBERED' : 'BULLET';
            mapped.push({
                sectionId,
                kind: 'list',
                titleDe: section.title ?? section.titleDe ?? null,
                titleEn: section.titleEnglish ?? section.titleEn ?? null,
                style,
                itemsDe,
                itemsEn: (section.itemsEnglish ?? []).map((item) => String(item)),
            });
            continue;
        }

        if (kind === 'cta') {
            const headlineDe = textOrEmpty(section.headline).trim();
            const buttonLabelDe = textOrEmpty(section.buttonLabel).trim();
            const href = textOrEmpty(section.href).trim();
            if (!headlineDe || !buttonLabelDe || !href) {
                leftovers.push(section);
                continue;
            }
            mapped.push({
                sectionId,
                kind: 'cta',
                headlineDe,
                headlineEn: textOrEmpty(section.headlineEnglish),
                bodyDe: section.body ?? null,
                bodyEn: section.bodyEnglish ?? null,
                buttonLabelDe,
                buttonLabelEn: textOrEmpty(section.buttonLabelEnglish),
                href,
            });
            continue;
        }

        // content (explicit or legacy untyped rows with title/content)
        const titleDe = section.titleDe ?? section.title ?? '';
        const titleEn = section.titleEn ?? section.titleEnglish ?? '';
        const bodyDe = section.body ?? section.content ?? '';
        const bodyEn = section.bodyEnglish ?? section.contentEnglish ?? '';

        if (!textOrEmpty(bodyDe).trim() && !imageFileUploadId) {
            leftovers.push(section);
            continue;
        }

        if (imageFileUploadId && !textOrEmpty(bodyDe).trim() && !textOrEmpty(titleDe).trim()) {
            mapped.push({ sectionId, kind: 'image', imageFileUploadId });
            continue;
        }

        mapped.push({
            sectionId,
            kind: 'content',
            titleDe: titleDe || null,
            titleEn: titleEn || null,
            subtitleDe: section.subtitle ?? null,
            subtitleEn: section.subtitleEnglish ?? null,
            bodyDe: bodyDe || titleDe || ' ',
            bodyEn: bodyEn || '',
            imageFileUploadId: imageFileUploadId ?? null,
            imageFirst: section.imageFirst ?? section.renderImageFirst ?? null,
        });
    }

    return { sections: mapped, leftovers };
}

export function extractImageIdFromUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split('/').filter(Boolean);
        const last = parts[parts.length - 1];
        if (!last) return null;
        return last.replace(/\.(png|jpe?g|webp|gif)$/i, '');
    } catch {
        const match = /\/([A-Za-z0-9_-]{20})(?:\.[a-z]+)?(?:\?|$)/i.exec(url);
        return match?.[1] ?? null;
    }
}

/**
 * mysql2 may return JSON columns as already-parsed values or as strings
 * (and occasionally Buffers). Normalize to a T[] before iterating.
 */
export function legacyJsonArray<T = unknown>(value: unknown): T[] {
    if (value == null) return [];
    if (Array.isArray(value)) return value as T[];
    const asString = Buffer.isBuffer(value) ? value.toString('utf8') : typeof value === 'string' ? value : null;
    if (asString == null) return [];
    const trimmed = asString.trim();
    if (!trimmed) return [];
    try {
        const parsed: unknown = JSON.parse(trimmed);
        return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
        return [];
    }
}

/**
 * Prefer fetching people-eat media via route + id (adds `?el=1024`, uses
 * SOURCE_WEB_ORIGIN) over the raw stored URL, which often lacks `el` and may
 * point at a stale host.
 */
export function peopleEatImageRouteFromUrl(url: string | null | undefined): { route: string; imageId: string } | null {
    if (!url) return null;
    const imageId = extractImageIdFromUrl(url);
    if (!imageId || !isNanoId(imageId)) return null;
    try {
        const parts = new URL(url).pathname.split('/').filter(Boolean);
        const route = parts.length >= 2 ? parts[0] : null;
        if (!route) return null;
        return { route, imageId };
    } catch {
        const match = /\/([a-z0-9-]+)\/([A-Za-z0-9_-]{20})(?:\.[a-z]+)?(?:\?|$)/i.exec(url);
        if (!match?.[1] || !match[2]) return null;
        return { route: match[1], imageId: match[2] };
    }
}

export function joinName(first: string | null | undefined, last: string | null | undefined): string {
    return [first, last]
        .filter((part) => part && part.trim())
        .join(' ')
        .trim();
}

/** MySQL `DATE` (`YYYY-MM-DD`) or naive `DATETIME` (`YYYY-MM-DD[ T]HH:mm:ss[.f]`). */
const MYSQL_NAIVE_DATE_RE = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?)?$/;

/**
 * Parse predecessor MySQL temporal values into an absolute instant.
 *
 * Naive DATE/DATETIME strings are treated as **UTC** (matching production people-eat Docker,
 * which stores UTC wall-clock digits in `DATETIME`). ISO strings with an offset/`Z` keep their
 * stated instant. `Date` instances from mysql2 with `timezone: 'Z'` are passed through.
 */
export function asDate(value: Date | string | null | undefined): Date | null {
    if (value == null) return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    const trimmed = value.trim();
    if (!trimmed) return null;

    const naive = MYSQL_NAIVE_DATE_RE.exec(trimmed);
    if (naive) {
        const [, ymd, hour = '00', minute = '00', second = '00', fraction] = naive;
        const ms = fraction ? fraction.padEnd(3, '0').slice(0, 3) : '000';
        const date = new Date(`${ymd}T${hour}:${minute}:${second}.${ms}Z`);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function asDateString(value: Date | string | null | undefined): string | null {
    const date = asDate(value);
    if (!date) return null;
    return date.toISOString().slice(0, 10);
}

/**
 * Reshape predecessor `WEB_PAGE_INTERACTION` payloads:
 * - Known booking-form Next / Send clicks → `{ area: booking_request_form, interaction: { type: 'step_completed', step } }`
 * - Otherwise rename `areaName` → `area` and leave free-form click/change keys as-is
 */
export function sessionEventPayloadFromLegacy(payload: unknown): unknown {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
    const record = payload as Record<string, unknown>;

    const areaLabel = typeof record.areaName === 'string' ? record.areaName : typeof record.area === 'string' ? record.area : null;
    const interaction = record.interaction;
    if (areaLabel && interaction && typeof interaction === 'object' && !Array.isArray(interaction)) {
        const interactionRecord = interaction as Record<string, unknown>;
        if (interactionRecord.type === 'click' && typeof interactionRecord.key === 'string') {
            const step = LEGACY_BOOKING_FORM_FUNNEL_CLICKS.get(`${areaLabel}\0${interactionRecord.key}`);
            if (step) {
                return {
                    webPageKey: record.webPageKey ?? 'BOOKING_REQUEST_FORM',
                    area: bookingRequestFormFunnelArea,
                    interaction: { type: 'step_completed', step },
                };
            }
        }
    }

    if (!('areaName' in record) || 'area' in record) return payload;
    const { areaName, ...rest } = record;
    return { ...rest, area: areaName };
}

/**
 * Align predecessor pathNames with peopleeat slug rules. Original values that
 * differ are kept in `previousPathNames` for 301 redirects. Collisions (e.g.
 * `kassel` + `Kassel`) get a stable `${slug}-${idPrefix}` fallback.
 */
export function importPathNameResolve(input: {
    rawPathName: string | null | undefined;
    entityId: string;
    previousPathNames?: string[] | null;
    usedPathNames: Set<string>;
}): { pathName: string; previousPathNames: string[] } {
    const original = String(input.rawPathName ?? '').trim();
    const fallback = pathNameSlugify(input.entityId) || input.entityId.toLowerCase();
    const preferred = pathNameSlugify(original) || fallback;

    let pathName = preferred;
    if (input.usedPathNames.has(pathName)) {
        const suffix = input.entityId.slice(0, 8).toLowerCase();
        pathName = `${preferred}-${suffix}`;
        let n = 2;
        while (input.usedPathNames.has(pathName)) {
            pathName = `${preferred}-${suffix}-${n}`;
            n += 1;
        }
    }
    input.usedPathNames.add(pathName);

    const previousPathNames = [...(input.previousPathNames ?? [])];
    if (original && original !== pathName && !previousPathNames.includes(original)) {
        previousPathNames.push(original);
    }
    return { pathName, previousPathNames };
}
