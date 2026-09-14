import { z } from 'zod';

import { zNanoId } from './idCreate';
import type { Locale } from './locale';

const contentListStyles = ['BULLET', 'NUMBERED'] as const;

const contentSectionKinds = ['content', 'image', 'quote', 'list', 'cta', 'qa'] as const;
export type ContentSectionKind = (typeof contentSectionKinds)[number];

const optionalText = z.string().nullish();
const requiredText = z.string().min(1);

const contentSectionContentSchema = z.object({
    sectionId: zNanoId,
    kind: z.literal('content'),
    titleDe: optionalText,
    titleEn: optionalText,
    subtitleDe: optionalText,
    subtitleEn: optionalText,
    bodyDe: requiredText,
    bodyEn: z.string().default(''),
    imageFileUploadId: zNanoId.nullish(),
    imageFirst: z.boolean().nullish(),
});

const contentSectionImageSchema = z.object({
    sectionId: zNanoId,
    kind: z.literal('image'),
    imageFileUploadId: zNanoId,
});

const contentSectionQuoteSchema = z.object({
    sectionId: zNanoId,
    kind: z.literal('quote'),
    quoteDe: requiredText,
    quoteEn: z.string().default(''),
    attributionDe: optionalText,
    attributionEn: optionalText,
});

const contentSectionListSchema = z.object({
    sectionId: zNanoId,
    kind: z.literal('list'),
    titleDe: optionalText,
    titleEn: optionalText,
    style: z.enum(contentListStyles),
    itemsDe: z.array(z.string()).min(1),
    itemsEn: z.array(z.string()).default([]),
});

const contentSectionCtaSchema = z.object({
    sectionId: zNanoId,
    kind: z.literal('cta'),
    headlineDe: requiredText,
    headlineEn: z.string().default(''),
    bodyDe: optionalText,
    bodyEn: optionalText,
    buttonLabelDe: requiredText,
    buttonLabelEn: z.string().default(''),
    href: requiredText,
});

const contentSectionQaEntrySchema = z.object({
    entryId: zNanoId,
    questionDe: requiredText,
    questionEn: z.string().default(''),
    answerDe: requiredText,
    answerEn: z.string().default(''),
});

const contentSectionQaSchema = z.object({
    sectionId: zNanoId,
    kind: z.literal('qa'),
    titleDe: optionalText,
    titleEn: optionalText,
    entries: z.array(contentSectionQaEntrySchema).min(1),
});

export const contentSectionSchema = z.discriminatedUnion('kind', [
    contentSectionContentSchema,
    contentSectionImageSchema,
    contentSectionQuoteSchema,
    contentSectionListSchema,
    contentSectionCtaSchema,
    contentSectionQaSchema,
]);

export const contentSectionsSchema = z.array(contentSectionSchema);

export type ContentSection = z.infer<typeof contentSectionSchema>;

/** Prefer EN when non-empty; otherwise DE. */
export function contentLocaleText(de: string, en: string | null | undefined, locale: Locale): string {
    if (locale === 'en' && en?.trim()) return en;
    return de;
}

export function contentLocaleItems(itemsDe: string[], itemsEn: string[] | null | undefined, locale: Locale): string[] {
    if (locale === 'en' && itemsEn && itemsEn.length > 0) return itemsEn;
    return itemsDe;
}

export function pathNameSlugify(value: string): string {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function fileUploadPublicUrl(fileUploadId: string): string {
    return `/api/file-uploads/${fileUploadId}`;
}
