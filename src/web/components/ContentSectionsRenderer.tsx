import { ImageOffIcon } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';

import type { ContentSection } from '../../shared/contentSection';
import { contentLocaleItems, contentLocaleText, fileUploadPublicUrl } from '../../shared/contentSection';
import type { Locale } from '../../shared/locale';
import { SectionQuestionsAndAnswers } from '../sections/SectionQuestionsAndAnswers';
import { cn } from '../utils/cn';
import { AppImage } from './AppImage';
import { Button } from './base/button';
import { MarkdownBody } from './MarkdownBody';

/** Matches `ContentSectionsEditor` until an image is uploaded. */
const UNSET_IMAGE_FILE_UPLOAD_ID = '00000000000000000000';

export function ContentSectionsRenderer({
    sections,
    locale,
    className,
}: {
    sections: ContentSection[];
    locale: Locale;
    className?: string;
}) {
    if (sections.length === 0) return null;

    return (
        <div className={cn('mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-16 @lg:px-6', className)}>
            {sections.map((section) => (
                <div key={section.sectionId} data-content-preview-anchor={`section:${section.sectionId}`}>
                    <ContentSectionView section={section} locale={locale} />
                </div>
            ))}
        </div>
    );
}

function ContentSectionView({ section, locale }: { section: ContentSection; locale: Locale }) {
    switch (section.kind) {
        case 'content':
            return <ContentBlock section={section} locale={locale} />;
        case 'image': {
            const imageUrl = resolvedImageUrl(section.imageFileUploadId);
            if (!imageUrl) {
                return <ImagePlaceholder label={{ de: 'Kein Bild', en: 'No image' }[locale]} />;
            }
            return (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                    <AppImage src={imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
                </div>
            );
        }
        case 'quote': {
            const quote = contentLocaleText(section.quoteDe, section.quoteEn, locale).trim();
            const attribution = contentLocaleText(section.attributionDe ?? '', section.attributionEn, locale).trim();
            return (
                <figure className="border-l-2 border-foreground/20 pl-6">
                    <blockquote className="whitespace-pre-wrap font-serif text-2xl font-light text-foreground @md:text-3xl">
                        {quote || <PlaceholderText>{{ de: 'Zitat fehlt', en: 'Quote missing' }[locale]}</PlaceholderText>}
                    </blockquote>
                    {attribution ? <figcaption className="mt-3 text-sm text-muted-foreground">{attribution}</figcaption> : null}
                </figure>
            );
        }
        case 'list': {
            const items = contentLocaleItems(section.itemsDe, section.itemsEn, locale)
                .map((item) => item.trim())
                .filter(Boolean);
            const title = contentLocaleText(section.titleDe ?? '', section.titleEn, locale).trim();
            const ListTag = section.style === 'NUMBERED' ? 'ol' : 'ul';
            return (
                <div className="flex flex-col gap-4">
                    {title ? <h2 className="font-serif text-2xl font-light">{title}</h2> : null}
                    <ListTag
                        className={cn(
                            'flex flex-col gap-2 pl-6 text-base/relaxed',
                            section.style === 'NUMBERED' ? 'list-decimal' : 'list-disc',
                        )}
                    >
                        {items.length > 0 ? (
                            items.map((item, index) => <li key={`${section.sectionId}-${index}`}>{item}</li>)
                        ) : (
                            <li>
                                <PlaceholderText>{{ de: 'Listenpunkt fehlt', en: 'List item missing' }[locale]}</PlaceholderText>
                            </li>
                        )}
                    </ListTag>
                </div>
            );
        }
        case 'cta': {
            const headline = contentLocaleText(section.headlineDe, section.headlineEn, locale).trim();
            const body = contentLocaleText(section.bodyDe ?? '', section.bodyEn, locale).trim();
            const buttonLabel = contentLocaleText(section.buttonLabelDe, section.buttonLabelEn, locale).trim();
            return (
                <div className="flex flex-col items-start gap-4 rounded-xl border-l-4 border-accent bg-accent/10 px-8 py-10">
                    <h2 className="font-serif text-3xl font-light">
                        {headline || <PlaceholderText>{{ de: 'Überschrift fehlt', en: 'Headline missing' }[locale]}</PlaceholderText>}
                    </h2>
                    {body ? <p className="max-w-prose whitespace-pre-wrap text-base/relaxed text-muted-foreground">{body}</p> : null}
                    <CtaLink
                        href={section.href.trim() || '#'}
                        label={buttonLabel || { de: 'Button-Text fehlt', en: 'Button label missing' }[locale]}
                        placeholder={!buttonLabel}
                    />
                </div>
            );
        }
        case 'qa': {
            const title = contentLocaleText(section.titleDe ?? '', section.titleEn, locale);
            const faqs = section.entries.map((entry) => {
                const question = contentLocaleText(entry.questionDe, entry.questionEn, locale).trim();
                const answer = contentLocaleText(entry.answerDe, entry.answerEn, locale).trim();
                return {
                    question: question || { de: 'Frage fehlt', en: 'Question missing' }[locale],
                    answer: answer || { de: 'Antwort fehlt', en: 'Answer missing' }[locale],
                    answerFormat: 'markdown' as const,
                };
            });
            return (
                <SectionQuestionsAndAnswers
                    className="max-w-none gap-6 [&_h2]:text-2xl [&_h2]:@3xl:text-2xl"
                    inset={false}
                    title={title}
                    faqs={
                        faqs.length > 0
                            ? faqs
                            : [
                                  {
                                      question: { de: 'Frage fehlt', en: 'Question missing' }[locale],
                                      answer: { de: 'Antwort fehlt', en: 'Answer missing' }[locale],
                                      answerFormat: 'markdown',
                                  },
                              ]
                    }
                />
            );
        }
    }
}

function ContentBlock({ section, locale }: { section: Extract<ContentSection, { kind: 'content' }>; locale: Locale }) {
    const title = contentLocaleText(section.titleDe ?? '', section.titleEn, locale).trim();
    const subtitle = contentLocaleText(section.subtitleDe ?? '', section.subtitleEn, locale).trim();
    const body = contentLocaleText(section.bodyDe, section.bodyEn, locale).trim();
    const imageUrl = resolvedImageUrl(section.imageFileUploadId);
    const imageFirst = Boolean(section.imageFirst);

    const text = (
        <div className="flex min-w-0 flex-1 flex-col gap-3">
            {title ? <h2 className="font-serif text-3xl font-light">{title}</h2> : null}
            {subtitle ? <p className="text-lg text-muted-foreground">{subtitle}</p> : null}
            {body ? (
                <MarkdownBody text={body} />
            ) : (
                <p>
                    <PlaceholderText>{{ de: 'Text fehlt', en: 'Body missing' }[locale]}</PlaceholderText>
                </p>
            )}
        </div>
    );

    if (!imageUrl) return text;

    return (
        <div className={cn('flex items-start gap-6', imageFirst ? 'flex-col @md:flex-row' : 'flex-col-reverse @md:flex-row-reverse')}>
            <div className="min-w-0 w-full overflow-hidden rounded-lg bg-muted @md:flex-1">
                <AppImage src={imageUrl} alt="" className="aspect-square w-full object-cover" />
            </div>
            {text}
        </div>
    );
}

function CtaLink({ href, label, placeholder }: { href: string; label: string; placeholder?: boolean }) {
    function preventPlaceholderNavigation(event: MouseEvent<HTMLAnchorElement>) {
        event.preventDefault();
    }

    return (
        <Button asChild className={placeholder ? 'italic' : undefined}>
            <a href={href} {...(placeholder ? { 'aria-disabled': true, onClick: preventPlaceholderNavigation } : {})}>
                {label}
            </a>
        </Button>
    );
}

function ImagePlaceholder({ label }: { label: string }) {
    return (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-muted text-muted-foreground">
            <ImageOffIcon className="size-10" aria-hidden />
            <p className="text-sm font-medium">{label}</p>
        </div>
    );
}

function PlaceholderText({ children }: { children: ReactNode }) {
    return <span className="italic text-muted-foreground">{children}</span>;
}

function resolvedImageUrl(fileUploadId: string | null | undefined): string | null {
    if (!fileUploadId || fileUploadId === UNSET_IMAGE_FILE_UPLOAD_ID) return null;
    return fileUploadPublicUrl(fileUploadId);
}
