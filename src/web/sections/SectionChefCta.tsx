import { Link } from '@tanstack/react-router';
import { ImageOffIcon, StarIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import type { Locale } from '../../shared/locale';
import { SITE_GOOGLE_MAPS_URL, SITE_WHATSAPP_URL } from '../../shared/siteBranding';
import { Button } from '../components/base/button';
import { cn } from '../utils/cn';

const GOOGLE_RATING = '5.0';

export function SectionChefCta({
    locale,
    displayName,
    imageUrl,
    noImageLabel,
    ctaUrl,
    banner,
    className,
}: {
    locale: Locale;
    /** Partner or occasion name shown over the CTA image. */
    displayName: string;
    imageUrl?: string | null;
    /** Shown with an icon when `imageUrl` is missing (e.g. admin preview). */
    noImageLabel?: string;
    /** When set, overrides the default booking-request form link. */
    ctaUrl?: string | null;
    banner?: ReactNode;
    className?: string;
}) {
    const hasImage = Boolean(imageUrl);
    const ctaLabel = { de: 'Deinen Privatkoch finden', en: 'Request' }[locale];
    const trimmedCtaUrl = ctaUrl?.trim() || null;

    return (
        <div className={cn('overflow-hidden rounded-2xl bg-background shadow-md ring-1 ring-black/5', className)}>
            <div className="relative aspect-6/3 w-full bg-muted">
                {imageUrl ? <img src={imageUrl} alt={displayName} className="absolute inset-0 size-full object-cover" /> : null}
                {!hasImage && noImageLabel ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <ImageOffIcon className="size-10" aria-hidden />
                        <p className="text-sm font-medium">{noImageLabel}</p>
                    </div>
                ) : null}
                {hasImage ? <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" /> : null}
                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-6">
                    <h3 className={cn('font-serif text-2xl/tight font-light @md:text-3xl', hasImage ? 'text-white' : 'text-foreground')}>
                        {displayName}
                    </h3>
                    <p
                        className={cn(
                            'text-xs font-light uppercase tracking-[0.2em] @md:text-sm',
                            hasImage ? 'text-white/90' : 'text-muted-foreground',
                        )}
                    >
                        {{ de: 'Privatkoch mieten', en: 'Hire a private chef' }[locale]}
                    </p>
                    <p className={cn('text-xs font-light @md:text-sm', hasImage ? 'text-white/80' : 'text-muted-foreground')}>
                        {{ de: 'Menüs ab 85 € p.P. • Mindestbuchung 400 €', en: 'Menus from €85 p.p. • Minimum booking €400' }[locale]}
                    </p>
                </div>
            </div>

            <div className="flex flex-col items-center gap-4 p-6">
                <Button asChild className="w-full" size="lg">
                    {trimmedCtaUrl ? <a href={trimmedCtaUrl}>{ctaLabel}</a> : <Link to="/{-$locale}/booking-request/form">{ctaLabel}</Link>}
                </Button>
                {banner}
                <a
                    href={SITE_WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                    {{ de: 'WhatsApp uns', en: 'WhatsApp Us' }[locale]} <span aria-hidden="true">→</span>
                </a>
                <a
                    href={SITE_GOOGLE_MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                    <span>Google</span>
                    <span aria-label={`${GOOGLE_RATING} / 5`} className="flex items-center gap-0.5">
                        {[0, 1, 2, 3, 4].map((position) => (
                            <StarIcon aria-hidden="true" className="size-4 fill-yellow-400 text-yellow-400" key={position} />
                        ))}
                    </span>
                    <span>{GOOGLE_RATING}</span>
                </a>
            </div>
        </div>
    );
}
