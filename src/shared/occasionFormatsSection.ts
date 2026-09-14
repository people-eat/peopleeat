import { z } from 'zod';

import { zNanoId } from './idCreate';

const optionalText = z.string().default('');

const occasionFormatsCardSchema = z.object({
    imageFileUploadId: zNanoId.nullish().transform((value) => value ?? null),
    titleDe: optionalText,
    titleEn: optionalText,
    bodyDe: optionalText,
    bodyEn: optionalText,
    fact1De: optionalText,
    fact1En: optionalText,
    fact2De: optionalText,
    fact2En: optionalText,
    fact3De: optionalText,
    fact3En: optionalText,
});

export const occasionFormatsSectionSchema = z.object({
    titleDe: optionalText,
    titleEn: optionalText,
    subtitleDe: optionalText,
    subtitleEn: optionalText,
    cards: z.tuple([occasionFormatsCardSchema, occasionFormatsCardSchema, occasionFormatsCardSchema]),
});

type OccasionFormatsCard = z.infer<typeof occasionFormatsCardSchema>;
export type OccasionFormatsSection = z.infer<typeof occasionFormatsSectionSchema>;

function occasionFormatsCardEmpty(): OccasionFormatsCard {
    return {
        imageFileUploadId: null,
        titleDe: '',
        titleEn: '',
        bodyDe: '',
        bodyEn: '',
        fact1De: '',
        fact1En: '',
        fact2De: '',
        fact2En: '',
        fact3De: '',
        fact3En: '',
    };
}

export function occasionFormatsSectionEmpty(): OccasionFormatsSection {
    return {
        titleDe: '',
        titleEn: '',
        subtitleDe: '',
        subtitleEn: '',
        cards: [occasionFormatsCardEmpty(), occasionFormatsCardEmpty(), occasionFormatsCardEmpty()],
    };
}

type OccasionFormatsSectionContent = {
    titleDe: string;
    titleEn: string;
    subtitleDe: string;
    subtitleEn: string;
    cards: ReadonlyArray<{
        imageFileUploadId?: string | null;
        titleDe: string;
        titleEn: string;
        bodyDe: string;
        bodyEn: string;
        fact1De: string;
        fact1En: string;
        fact2De: string;
        fact2En: string;
        fact3De: string;
        fact3En: string;
    }>;
};

/** True when the section has any visitor-facing copy worth rendering on the public page. */
export function occasionFormatsSectionHasContent(section: OccasionFormatsSectionContent): boolean {
    if (section.titleDe.trim() || section.titleEn.trim()) return true;
    if (section.subtitleDe.trim() || section.subtitleEn.trim()) return true;
    return section.cards.some(
        (card) =>
            card.titleDe.trim() ||
            card.titleEn.trim() ||
            card.bodyDe.trim() ||
            card.bodyEn.trim() ||
            card.fact1De.trim() ||
            card.fact1En.trim() ||
            card.fact2De.trim() ||
            card.fact2En.trim() ||
            card.fact3De.trim() ||
            card.fact3En.trim() ||
            Boolean(card.imageFileUploadId),
    );
}
