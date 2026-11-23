import { ImageOffIcon } from 'lucide-react';

import { t } from '../../i18n/t';
import { contentLocaleText } from '../../shared/contentSection';
import type { Locale } from '../../shared/locale';
import { occasionFormatsSectionHasContent } from '../../shared/occasionFormatsSection';
import { AppImage } from '../components/AppImage';
import { cn } from '../utils/cn';

type SectionOccasionFormatsCard = {
    imageFileUploadId?: string | null;
    imageUrl?: string | null;
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
};

export type SectionOccasionFormatsModel = {
    titleDe: string;
    titleEn: string;
    subtitleDe: string;
    subtitleEn: string;
    cards: readonly [SectionOccasionFormatsCard, SectionOccasionFormatsCard, SectionOccasionFormatsCard];
};

function cardFacts(card: SectionOccasionFormatsCard, locale: Locale): string[] {
    return [
        contentLocaleText(card.fact1De, card.fact1En, locale).trim(),
        contentLocaleText(card.fact2De, card.fact2En, locale).trim(),
        contentLocaleText(card.fact3De, card.fact3En, locale).trim(),
    ].filter(Boolean);
}

export function SectionOccasionFormats({
    locale,
    formatsSection,
    forceShow = false,
    className,
}: {
    locale: Locale;
    formatsSection: SectionOccasionFormatsModel;
    /** Admin preview always shows the slot with placeholders. */
    forceShow?: boolean;
    className?: string;
}) {
    if (!forceShow && !occasionFormatsSectionHasContent(formatsSection)) {
        return null;
    }

    const title = contentLocaleText(formatsSection.titleDe, formatsSection.titleEn, locale).trim();
    const subtitle = contentLocaleText(formatsSection.subtitleDe, formatsSection.subtitleEn, locale).trim();

    return (
        <section className={cn('mx-auto w-full max-w-7xl px-4 py-16 @lg:px-6', className)}>
            <div className="mx-auto mb-12 flex max-w-3xl flex-col gap-4 text-center">
                <h2 className="font-serif text-3xl font-light @md:text-4xl">
                    {title || <span className="italic text-muted-foreground">{t(locale, 'public', 'preview.titleMissing')}</span>}
                </h2>
                <p className={cn('text-base/7', subtitle ? 'text-muted-foreground' : 'italic text-muted-foreground')}>
                    {subtitle || t(locale, 'public', 'preview.subtitleMissing')}
                </p>
            </div>

            <div className="grid gap-8 @md:grid-cols-3 @md:gap-6">
                {formatsSection.cards.map((card, index) => {
                    const cardTitle = contentLocaleText(card.titleDe, card.titleEn, locale).trim();
                    const cardBody = contentLocaleText(card.bodyDe, card.bodyEn, locale).trim();
                    const facts = cardFacts(card, locale);
                    const imageUrl = card.imageUrl?.trim() || null;

                    return (
                        <article key={index} className="flex flex-col gap-4">
                            <div className="relative aspect-4/3 overflow-hidden rounded-lg bg-muted">
                                {imageUrl ? (
                                    <AppImage
                                        src={imageUrl}
                                        alt={cardTitle ? t(locale, 'common', 'imageAlt.photoOf', { name: cardTitle }) : ''}
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                        <ImageOffIcon className="size-10" aria-hidden />
                                        <p className="text-sm font-medium">{t(locale, 'public', 'preview.noImage')}</p>
                                    </div>
                                )}
                            </div>
                            <h3 className="font-serif text-xl font-normal">
                                {cardTitle || (
                                    <span className="italic text-muted-foreground">{t(locale, 'public', 'preview.titleMissing')}</span>
                                )}
                            </h3>
                            <p className={cn('grow text-sm/6', cardBody ? 'text-muted-foreground' : 'italic text-muted-foreground')}>
                                {cardBody || t(locale, 'public', 'preview.bodyMissing')}
                            </p>
                            <p className={cn('text-xs text-muted-foreground', facts.length === 0 ? 'italic' : undefined)}>
                                {facts.length > 0 ? facts.join(' | ') : t(locale, 'public', 'preview.detailsMissing')}
                            </p>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
