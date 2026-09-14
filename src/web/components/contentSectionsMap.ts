import type { ContentSection } from '../../shared/contentSection';

type GqlContentSectionQaEntry = {
    entryId: string;
    questionDe: string;
    questionEn: string;
    answerDe: string;
    answerEn: string;
};

type GqlContentSectionFields = {
    __typename?: string | null;
    sectionId: string;
    titleDe?: string | null;
    titleEn?: string | null;
    subtitleDe?: string | null;
    subtitleEn?: string | null;
    contentBodyDe?: string | null;
    contentBodyEn?: string | null;
    contentImageFileUploadId?: string | null;
    contentImageUrl?: string | null;
    imageFirst?: boolean | null;
    imageImageFileUploadId?: string | null;
    imageImageUrl?: string | null;
    quoteDe?: string | null;
    quoteEn?: string | null;
    attributionDe?: string | null;
    attributionEn?: string | null;
    style?: 'BULLET' | 'NUMBERED' | null;
    itemsDe?: string[] | null;
    itemsEn?: string[] | null;
    headlineDe?: string | null;
    headlineEn?: string | null;
    ctaBodyDe?: string | null;
    ctaBodyEn?: string | null;
    buttonLabelDe?: string | null;
    buttonLabelEn?: string | null;
    href?: string | null;
    entries?: GqlContentSectionQaEntry[] | null;
};

/** Narrow a GraphQL ContentSection union selection into the shared domain shape. */
export function contentSectionsFromGql(sections: ReadonlyArray<GqlContentSectionFields>): ContentSection[] {
    return sections.map((section): ContentSection => {
        switch (section.__typename) {
            case 'ContentSectionContent':
                return {
                    sectionId: section.sectionId,
                    kind: 'content',
                    titleDe: section.titleDe,
                    titleEn: section.titleEn,
                    subtitleDe: section.subtitleDe,
                    subtitleEn: section.subtitleEn,
                    bodyDe: section.contentBodyDe ?? '',
                    bodyEn: section.contentBodyEn ?? '',
                    imageFileUploadId: section.contentImageFileUploadId,
                    imageFirst: section.imageFirst,
                };
            case 'ContentSectionImage':
                return {
                    sectionId: section.sectionId,
                    kind: 'image',
                    imageFileUploadId: section.imageImageFileUploadId ?? '',
                };
            case 'ContentSectionQuote':
                return {
                    sectionId: section.sectionId,
                    kind: 'quote',
                    quoteDe: section.quoteDe ?? '',
                    quoteEn: section.quoteEn ?? '',
                    attributionDe: section.attributionDe,
                    attributionEn: section.attributionEn,
                };
            case 'ContentSectionList':
                return {
                    sectionId: section.sectionId,
                    kind: 'list',
                    titleDe: section.titleDe,
                    titleEn: section.titleEn,
                    style: section.style ?? 'BULLET',
                    itemsDe: section.itemsDe ?? [],
                    itemsEn: section.itemsEn ?? [],
                };
            case 'ContentSectionCta':
                return {
                    sectionId: section.sectionId,
                    kind: 'cta',
                    headlineDe: section.headlineDe ?? '',
                    headlineEn: section.headlineEn ?? '',
                    bodyDe: section.ctaBodyDe,
                    bodyEn: section.ctaBodyEn,
                    buttonLabelDe: section.buttonLabelDe ?? '',
                    buttonLabelEn: section.buttonLabelEn ?? '',
                    href: section.href ?? '/',
                };
            case 'ContentSectionQa':
                return {
                    sectionId: section.sectionId,
                    kind: 'qa',
                    titleDe: section.titleDe,
                    titleEn: section.titleEn,
                    entries: (section.entries ?? []).map((entry) => ({
                        entryId: entry.entryId,
                        questionDe: entry.questionDe,
                        questionEn: entry.questionEn,
                        answerDe: entry.answerDe,
                        answerEn: entry.answerEn,
                    })),
                };
            default:
                throw new Error(`Unknown content section typename: ${section.__typename}`);
        }
    });
}

export function contentSectionsToInput(sections: ContentSection[]) {
    return sections.map((section) => {
        switch (section.kind) {
            case 'content':
                return {
                    sectionId: section.sectionId,
                    kind: 'content' as const,
                    titleDe: section.titleDe,
                    titleEn: section.titleEn,
                    subtitleDe: section.subtitleDe,
                    subtitleEn: section.subtitleEn,
                    bodyDe: section.bodyDe,
                    bodyEn: section.bodyEn,
                    imageFileUploadId: section.imageFileUploadId,
                    imageFirst: section.imageFirst,
                };
            case 'image':
                return {
                    sectionId: section.sectionId,
                    kind: 'image' as const,
                    imageFileUploadId: section.imageFileUploadId,
                };
            case 'quote':
                return {
                    sectionId: section.sectionId,
                    kind: 'quote' as const,
                    quoteDe: section.quoteDe,
                    quoteEn: section.quoteEn,
                    attributionDe: section.attributionDe,
                    attributionEn: section.attributionEn,
                };
            case 'list':
                return {
                    sectionId: section.sectionId,
                    kind: 'list' as const,
                    titleDe: section.titleDe,
                    titleEn: section.titleEn,
                    style: section.style,
                    itemsDe: section.itemsDe,
                    itemsEn: section.itemsEn,
                };
            case 'cta':
                return {
                    sectionId: section.sectionId,
                    kind: 'cta' as const,
                    headlineDe: section.headlineDe,
                    headlineEn: section.headlineEn,
                    bodyDe: section.bodyDe,
                    bodyEn: section.bodyEn,
                    buttonLabelDe: section.buttonLabelDe,
                    buttonLabelEn: section.buttonLabelEn,
                    href: section.href,
                };
            case 'qa':
                return {
                    sectionId: section.sectionId,
                    kind: 'qa' as const,
                    titleDe: section.titleDe,
                    titleEn: section.titleEn,
                    entries: section.entries.map((entry) => ({
                        entryId: entry.entryId,
                        questionDe: entry.questionDe,
                        questionEn: entry.questionEn,
                        answerDe: entry.answerDe,
                        answerEn: entry.answerEn,
                    })),
                };
        }
    });
}
