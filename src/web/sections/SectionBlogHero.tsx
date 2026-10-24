import { ImageOffIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { AppImage } from '../components/AppImage';
import { cn } from '../utils/cn';

export function SectionBlogHero({
    headline,
    lead,
    imageUrl,
    imageAlt,
    noMediaLabel,
    className,
}: {
    headline?: ReactNode;
    lead?: ReactNode;
    imageUrl?: string | null;
    imageAlt?: string;
    /** Shown with an icon when `imageUrl` is missing (e.g. admin preview). */
    noMediaLabel?: string;
    className?: string;
}) {
    const hasHeadline = Boolean(headline);
    const hasLead = Boolean(lead);
    const hasImage = Boolean(imageUrl);

    if (!hasHeadline && !hasLead && !hasImage && !noMediaLabel) return null;

    return (
        <section className={cn('mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-12 pb-4 @lg:px-6', className)}>
            {hasHeadline ? <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground @md:text-5xl">{headline}</h1> : null}
            {hasLead ? <p className="text-base/relaxed text-foreground @md:text-lg/relaxed">{lead}</p> : null}
            {hasImage ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted">
                    <AppImage priority src={imageUrl!} alt={imageAlt ?? ''} className="absolute inset-0 size-full object-cover" />
                </div>
            ) : noMediaLabel ? (
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl bg-muted text-muted-foreground">
                    <ImageOffIcon className="size-12" aria-hidden />
                    <p className="text-sm font-medium">{noMediaLabel}</p>
                </div>
            ) : null}
        </section>
    );
}
