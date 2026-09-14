import { ImageOffIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { AutoplayVideo } from '../components/AutoplayVideo';
import { cn } from '../utils/cn';

export type SectionHeroMedia = {
    src: string;
    type: 'video' | 'image';
    /** Image `alt`, or accessible description for video fallback content. */
    alt: string;
};

export function SectionHero({
    headline,
    subheadline,
    media,
    noMediaLabel,
    className,
}: {
    headline?: ReactNode;
    subheadline?: ReactNode;
    media?: SectionHeroMedia | null;
    /** Shown with an icon when `media` is missing (e.g. admin preview). */
    noMediaLabel?: string;
    className?: string;
}) {
    const hasHeadline = Boolean(headline);
    const hasSubheadline = Boolean(subheadline);
    const hasMedia = Boolean(media);

    return (
        <section
            className={cn('relative h-dvh w-full overflow-hidden', !hasMedia && 'bg-muted', className)}
            {...(hasMedia ? { 'data-over-media': '' } : {})}
        >
            {media?.type === 'video' ? (
                <AutoplayVideo src={media.src} className="absolute inset-0 size-full object-cover">
                    <p>{media.alt}</p>
                </AutoplayVideo>
            ) : null}
            {media?.type === 'image' ? <img src={media.src} alt={media.alt} className="absolute inset-0 size-full object-cover" /> : null}
            {hasMedia ? <div className="absolute inset-0 bg-black/40" /> : null}
            {!hasMedia && noMediaLabel ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
                    <ImageOffIcon className="size-12" aria-hidden />
                    <p className="text-sm font-medium">{noMediaLabel}</p>
                </div>
            ) : null}
            {hasHeadline || hasSubheadline ? (
                <div className="absolute inset-x-0 bottom-20 mx-auto flex max-w-7xl flex-col gap-2 p-8 @lg:bottom-36">
                    {hasHeadline ? (
                        <h1 className={cn('font-serif text-4xl font-light @md:text-7xl', hasMedia ? 'text-white' : 'text-foreground')}>
                            {headline}
                        </h1>
                    ) : null}
                    {hasSubheadline ? (
                        <h2
                            className={cn(
                                'font-sans text-lg font-extralight @md:text-4xl',
                                hasMedia ? 'text-white' : 'text-muted-foreground',
                            )}
                        >
                            {subheadline}
                        </h2>
                    ) : null}
                </div>
            ) : null}
        </section>
    );
}
