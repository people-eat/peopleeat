import type { ContentSection } from '../../shared/contentSection';
import { contentSectionsSchema, fileUploadPublicUrl } from '../../shared/contentSection';
import type { GqlSContentSection, GqlSContentSectionInput } from '../graphql/generated';

export function contentSectionsFromInput(inputs: readonly GqlSContentSectionInput[]): ContentSection[] {
    const raw = inputs.map((input) => {
        switch (input.kind) {
            case 'content':
                return {
                    sectionId: input.sectionId,
                    kind: 'content' as const,
                    titleDe: input.titleDe,
                    titleEn: input.titleEn,
                    subtitleDe: input.subtitleDe,
                    subtitleEn: input.subtitleEn,
                    bodyDe: input.bodyDe ?? '',
                    bodyEn: input.bodyEn ?? '',
                    imageFileUploadId: input.imageFileUploadId,
                    imageFirst: input.imageFirst,
                };
            case 'image':
                return {
                    sectionId: input.sectionId,
                    kind: 'image' as const,
                    imageFileUploadId: input.imageFileUploadId ?? '',
                };
            case 'quote':
                return {
                    sectionId: input.sectionId,
                    kind: 'quote' as const,
                    quoteDe: input.quoteDe ?? '',
                    quoteEn: input.quoteEn ?? '',
                    attributionDe: input.attributionDe,
                    attributionEn: input.attributionEn,
                };
            case 'list':
                return {
                    sectionId: input.sectionId,
                    kind: 'list' as const,
                    titleDe: input.titleDe,
                    titleEn: input.titleEn,
                    style: input.style ?? 'BULLET',
                    itemsDe: input.itemsDe ?? [],
                    itemsEn: input.itemsEn ?? [],
                };
            case 'cta':
                return {
                    sectionId: input.sectionId,
                    kind: 'cta' as const,
                    headlineDe: input.headlineDe ?? '',
                    headlineEn: input.headlineEn ?? '',
                    bodyDe: input.bodyDe,
                    bodyEn: input.bodyEn,
                    buttonLabelDe: input.buttonLabelDe ?? '',
                    buttonLabelEn: input.buttonLabelEn ?? '',
                    href: input.href ?? '',
                };
            case 'qa':
                return {
                    sectionId: input.sectionId,
                    kind: 'qa' as const,
                    titleDe: input.titleDe,
                    titleEn: input.titleEn,
                    entries: (input.entries ?? []).map((entry) => ({
                        entryId: entry.entryId,
                        questionDe: entry.questionDe,
                        questionEn: entry.questionEn ?? '',
                        answerDe: entry.answerDe,
                        answerEn: entry.answerEn ?? '',
                    })),
                };
        }
    });
    return contentSectionsSchema.parse(raw);
}

export function toGqlContentSection(section: ContentSection): GqlSContentSection {
    switch (section.kind) {
        case 'content':
            return {
                gqlTypeName: 'ContentSectionContent',
                sectionId: section.sectionId,
                titleDe: section.titleDe ?? null,
                titleEn: section.titleEn ?? null,
                subtitleDe: section.subtitleDe ?? null,
                subtitleEn: section.subtitleEn ?? null,
                bodyDe: section.bodyDe,
                bodyEn: section.bodyEn,
                imageFileUploadId: section.imageFileUploadId ?? null,
                imageUrl: section.imageFileUploadId ? fileUploadPublicUrl(section.imageFileUploadId) : null,
                imageFirst: section.imageFirst ?? null,
            };
        case 'image':
            return {
                gqlTypeName: 'ContentSectionImage',
                sectionId: section.sectionId,
                imageFileUploadId: section.imageFileUploadId,
                imageUrl: fileUploadPublicUrl(section.imageFileUploadId),
            };
        case 'quote':
            return {
                gqlTypeName: 'ContentSectionQuote',
                sectionId: section.sectionId,
                quoteDe: section.quoteDe,
                quoteEn: section.quoteEn,
                attributionDe: section.attributionDe ?? null,
                attributionEn: section.attributionEn ?? null,
            };
        case 'list':
            return {
                gqlTypeName: 'ContentSectionList',
                sectionId: section.sectionId,
                titleDe: section.titleDe ?? null,
                titleEn: section.titleEn ?? null,
                style: section.style,
                itemsDe: section.itemsDe,
                itemsEn: section.itemsEn,
            };
        case 'cta':
            return {
                gqlTypeName: 'ContentSectionCta',
                sectionId: section.sectionId,
                headlineDe: section.headlineDe,
                headlineEn: section.headlineEn,
                bodyDe: section.bodyDe ?? null,
                bodyEn: section.bodyEn ?? null,
                buttonLabelDe: section.buttonLabelDe,
                buttonLabelEn: section.buttonLabelEn,
                href: section.href,
            };
        case 'qa':
            return {
                gqlTypeName: 'ContentSectionQa',
                sectionId: section.sectionId,
                titleDe: section.titleDe ?? null,
                titleEn: section.titleEn ?? null,
                entries: section.entries.map((entry) => ({
                    entryId: entry.entryId,
                    questionDe: entry.questionDe,
                    questionEn: entry.questionEn,
                    answerDe: entry.answerDe,
                    answerEn: entry.answerEn,
                })),
            };
    }
}
