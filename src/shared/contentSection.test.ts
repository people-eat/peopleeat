import { describe, expect, it } from 'vitest';

import { contentLocaleText, contentSectionSchema, contentSectionsSchema, pathNameSlugify } from './contentSection';

describe('contentSectionSchema', () => {
    it('accepts a content section', () => {
        const parsed = contentSectionSchema.parse({
            sectionId: '11111111111111111111',
            kind: 'content',
            bodyDe: 'Hallo',
            bodyEn: 'Hello',
        });
        expect(parsed.kind).toBe('content');
        if (parsed.kind === 'content') {
            expect(parsed.bodyDe).toBe('Hallo');
        }
    });

    it('rejects empty content body', () => {
        expect(() =>
            contentSectionSchema.parse({
                sectionId: '11111111111111111111',
                kind: 'content',
                bodyDe: '',
                bodyEn: '',
            }),
        ).toThrow();
    });

    it('parses a list of mixed sections', () => {
        const sections = contentSectionsSchema.parse([
            {
                sectionId: '11111111111111111111',
                kind: 'quote',
                quoteDe: 'Lecker',
                quoteEn: 'Delicious',
            },
            {
                sectionId: '22222222222222222222',
                kind: 'cta',
                headlineDe: 'Jetzt buchen',
                headlineEn: 'Book now',
                buttonLabelDe: 'Los',
                buttonLabelEn: 'Go',
                href: '/booking-request',
            },
            {
                sectionId: '33333333333333333333',
                kind: 'qa',
                titleDe: 'FAQ',
                titleEn: 'FAQ',
                entries: [
                    {
                        entryId: '44444444444444444444',
                        questionDe: 'Wie funktioniert das?',
                        questionEn: 'How does it work?',
                        answerDe: 'Ganz einfach.',
                        answerEn: 'Quite simply.',
                    },
                ],
            },
        ]);
        expect(sections).toHaveLength(3);
        expect(sections[2]?.kind).toBe('qa');
    });

    it('rejects a qa section without entries', () => {
        expect(() =>
            contentSectionSchema.parse({
                sectionId: '11111111111111111111',
                kind: 'qa',
                entries: [],
            }),
        ).toThrow();
    });
});

describe('contentLocaleText', () => {
    it('falls back to DE when EN is empty', () => {
        expect(contentLocaleText('Deutsch', '', 'en')).toBe('Deutsch');
        expect(contentLocaleText('Deutsch', 'English', 'en')).toBe('English');
    });
});

describe('pathNameSlugify', () => {
    it('builds a path slug from a city name', () => {
        expect(pathNameSlugify('Hamburg')).toBe('hamburg');
        expect(pathNameSlugify('München / City')).toBe('munchen-city');
    });
});
