import { describe, expect, it } from 'vitest';

import {
    asDate,
    asDateString,
    contentSectionsFromLegacy,
    importPathNameResolve,
    legacyJsonArray,
    peopleEatImageRouteFromUrl,
    sessionEventPayloadFromLegacy,
} from './transforms';

describe('contentSectionsFromLegacy', () => {
    it('maps cta / list / content with subtitle and renderImageFirst', () => {
        const { sections, leftovers } = contentSectionsFromLegacy(
            [
                {
                    sectionId: 'aaaaaaaaaaaaaaaaaaaa',
                    kind: 'content',
                    title: 'Titel',
                    titleEnglish: 'Title',
                    subtitle: 'Unter',
                    subtitleEnglish: 'Sub',
                    content: 'Body',
                    contentEnglish: 'Body EN',
                    renderImageFirst: true,
                    imageId: 'bbbbbbbbbbbbbbbbbbbb',
                },
                {
                    sectionId: 'cccccccccccccccccccc',
                    kind: 'list',
                    style: 'BULLET',
                    title: 'Liste',
                    items: ['Eins', 'Zwei'],
                    itemsEnglish: ['One', 'Two'],
                },
                {
                    sectionId: 'dddddddddddddddddddd',
                    kind: 'cta',
                    headline: 'CTA',
                    headlineEnglish: 'CTA EN',
                    body: 'Text',
                    bodyEnglish: 'Text EN',
                    buttonLabel: 'Los',
                    buttonLabelEnglish: 'Go',
                    href: 'https://example.com',
                },
            ],
            (imageId) => (imageId === 'bbbbbbbbbbbbbbbbbbbb' ? 'eeeeeeeeeeeeeeeeeeee' : null),
        );

        expect(leftovers).toEqual([]);
        expect(sections).toEqual([
            {
                sectionId: 'aaaaaaaaaaaaaaaaaaaa',
                kind: 'content',
                titleDe: 'Titel',
                titleEn: 'Title',
                subtitleDe: 'Unter',
                subtitleEn: 'Sub',
                bodyDe: 'Body',
                bodyEn: 'Body EN',
                imageFileUploadId: 'eeeeeeeeeeeeeeeeeeee',
                imageFirst: true,
            },
            {
                sectionId: 'cccccccccccccccccccc',
                kind: 'list',
                titleDe: 'Liste',
                titleEn: null,
                style: 'BULLET',
                itemsDe: ['Eins', 'Zwei'],
                itemsEn: ['One', 'Two'],
            },
            {
                sectionId: 'dddddddddddddddddddd',
                kind: 'cta',
                headlineDe: 'CTA',
                headlineEn: 'CTA EN',
                bodyDe: 'Text',
                bodyEn: 'Text EN',
                buttonLabelDe: 'Los',
                buttonLabelEn: 'Go',
                href: 'https://example.com',
            },
        ]);
    });

    it('leftovers empty list sections instead of dropping silently into content', () => {
        const { sections, leftovers } = contentSectionsFromLegacy(
            [{ sectionId: 'ffffffffffffffffffff', kind: 'list', style: 'BULLET', items: [] }],
            () => null,
        );
        expect(sections).toEqual([]);
        expect(leftovers).toHaveLength(1);
    });
});

describe('sessionEventPayloadFromLegacy', () => {
    it('maps predecessor booking-form Next clicks to step_completed funnel steps', () => {
        expect(
            sessionEventPayloadFromLegacy({
                webPageKey: 'BOOKING_REQUEST_FORM',
                areaName: 'Occasion Selection',
                interaction: { type: 'click', key: 'Next' },
            }),
        ).toEqual({
            webPageKey: 'BOOKING_REQUEST_FORM',
            area: 'booking_request_form',
            interaction: { type: 'step_completed', step: 'occasion' },
        });

        expect(
            sessionEventPayloadFromLegacy({
                webPageKey: 'BOOKING_REQUEST_FORM',
                areaName: 'About Customer',
                interaction: { type: 'click', key: 'Send Booking request' },
            }),
        ).toEqual({
            webPageKey: 'BOOKING_REQUEST_FORM',
            area: 'booking_request_form',
            interaction: { type: 'step_completed', step: 'auth' },
        });
    });

    it('renames areaName to area for non-funnel clicks', () => {
        expect(
            sessionEventPayloadFromLegacy({
                webPageKey: 'GIFT_CARD',
                areaName: 'Header',
                interaction: { type: 'click', key: 'Logo' },
            }),
        ).toEqual({
            webPageKey: 'GIFT_CARD',
            area: 'Header',
            interaction: { type: 'click', key: 'Logo' },
        });
    });

    it('leaves payloads without areaName unchanged', () => {
        const payload = { webPageKey: 'LANDING' };
        expect(sessionEventPayloadFromLegacy(payload)).toBe(payload);
    });
});

describe('legacyJsonArray', () => {
    it('parses MySQL JSON that arrives as a string or Buffer', () => {
        const sections = [{ sectionId: 'aaaaaaaaaaaaaaaaaaaa', kind: 'image', imageId: 'bbbbbbbbbbbbbbbbbbbb' }];
        expect(legacyJsonArray(sections)).toEqual(sections);
        expect(legacyJsonArray(JSON.stringify(sections))).toEqual(sections);
        expect(legacyJsonArray(Buffer.from(JSON.stringify(sections)))).toEqual(sections);
        expect(legacyJsonArray(null)).toEqual([]);
        expect(legacyJsonArray('not-json')).toEqual([]);
    });
});

describe('peopleEatImageRouteFromUrl', () => {
    it('extracts route + nanoId from people-eat media URLs', () => {
        expect(peopleEatImageRouteFromUrl('https://people-eat.com/city-hero-images/cccccccccccccccccccc')).toEqual({
            route: 'city-hero-images',
            imageId: 'cccccccccccccccccccc',
        });
        expect(peopleEatImageRouteFromUrl('https://people-eat.com/city-section-images/dddddddddddddddddddd?el=1024')).toEqual({
            route: 'city-section-images',
            imageId: 'dddddddddddddddddddd',
        });
        expect(peopleEatImageRouteFromUrl(null)).toBeNull();
    });
});

describe('importPathNameResolve', () => {
    it('normalizes pathName and archives the original in previousPathNames', () => {
        const used = new Set<string>();
        const first = importPathNameResolve({
            rawPathName: 'Münster',
            entityId: 'cityCityCityCityCity1',
            previousPathNames: [],
            usedPathNames: used,
        });
        expect(first.pathName).toBe('munster');
        expect(first.previousPathNames).toEqual(['Münster']);
    });

    it('suffixes on collision', () => {
        const used = new Set<string>(['kassel']);
        const second = importPathNameResolve({
            rawPathName: 'Kassel',
            entityId: 'bI9KI4Qg33GpV8fV9faW',
            previousPathNames: [],
            usedPathNames: used,
        });
        expect(second.pathName).toBe('kassel-bi9ki4qg');
        expect(second.previousPathNames).toEqual(['Kassel']);
    });
});

describe('asDate', () => {
    it('treats naive MySQL DATETIME digits as UTC (not process-local)', () => {
        // Predecessor Docker stores UTC digits; 16:00Z = 18:00 Europe/Berlin (CEST).
        expect(asDate('2026-06-15 16:00:00')?.toISOString()).toBe('2026-06-15T16:00:00.000Z');
        expect(asDate('2026-06-15T16:00:00')?.toISOString()).toBe('2026-06-15T16:00:00.000Z');
    });

    it('treats MySQL DATE as UTC midnight', () => {
        expect(asDate('1990-05-15')?.toISOString()).toBe('1990-05-15T00:00:00.000Z');
        expect(asDateString('1990-05-15')).toBe('1990-05-15');
    });

    it('keeps explicit ISO offsets', () => {
        expect(asDate('2026-06-15T18:00:00+02:00')?.toISOString()).toBe('2026-06-15T16:00:00.000Z');
        expect(asDate('2026-06-15T16:00:00.000Z')?.toISOString()).toBe('2026-06-15T16:00:00.000Z');
    });

    it('passes through Date instances and rejects invalid values', () => {
        const instant = new Date('2026-06-15T16:00:00.000Z');
        expect(asDate(instant)).toBe(instant);
        expect(asDate(null)).toBeNull();
        expect(asDate('not-a-date')).toBeNull();
    });
});
