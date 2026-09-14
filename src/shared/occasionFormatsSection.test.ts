import { describe, expect, it } from 'vitest';

import { occasionFormatsSectionEmpty, occasionFormatsSectionHasContent, occasionFormatsSectionSchema } from './occasionFormatsSection';

describe('occasionFormatsSectionSchema', () => {
    it('accepts the empty default shape', () => {
        const parsed = occasionFormatsSectionSchema.parse(occasionFormatsSectionEmpty());
        expect(parsed.cards).toHaveLength(3);
        expect(parsed.titleDe).toBe('');
        expect(parsed.cards[0].imageFileUploadId).toBeNull();
    });

    it('rejects fewer than three cards', () => {
        expect(() =>
            occasionFormatsSectionSchema.parse({
                ...occasionFormatsSectionEmpty(),
                cards: [occasionFormatsSectionEmpty().cards[0]],
            }),
        ).toThrow();
    });
});

describe('occasionFormatsSectionHasContent', () => {
    it('is false for the empty default', () => {
        expect(occasionFormatsSectionHasContent(occasionFormatsSectionEmpty())).toBe(false);
    });

    it('is true when a card title is set', () => {
        const section = occasionFormatsSectionEmpty();
        section.cards[0].titleDe = 'Seated Dinner';
        expect(occasionFormatsSectionHasContent(section)).toBe(true);
    });
});
