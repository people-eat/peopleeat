import { Link } from '@tanstack/react-router';

import { formatDate } from '../../shared';
import type { GqlCTestimonialPublicationStatus } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import { cn } from '../utils/cn';
import { Badge } from './base/badge';
import { bookingRequestCardInteractionClassName } from './bookingRequestCardInteraction';

export type AdminTestimonialListCardTestimonial = {
    kind: 'customer' | 'cook';
    testimonialId: string;
    displayAuthorName: string;
    displayLocation: string | null;
    displayOccasion: string | null;
    body: string | null;
    rating: number | null;
    publicationStatus: GqlCTestimonialPublicationStatus | string;
    publishedAt: string | null;
    createdAt: string;
    imageUrl: string | null;
};

function publicationLabel(status: string, locale: 'de' | 'en'): string {
    if (status === 'PUBLISHED') return { de: 'Veröffentlicht', en: 'Published' }[locale];
    return { de: 'Zur Prüfung', en: 'Pending review' }[locale];
}

export function AdminTestimonialListCard({ testimonial }: { testimonial: AdminTestimonialListCardTestimonial }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const kindLabel = testimonial.kind === 'customer' ? { de: 'Kunde', en: 'Customer' }[locale] : { de: 'Koch', en: 'Cook' }[locale];
    const createdLabel = formatDate(testimonial.createdAt, { locale, timeZone, dateStyle: 'medium' });
    const to =
        testimonial.kind === 'customer'
            ? ('/{-$locale}/admin/testimonials/customer/$customerTestimonialId' as const)
            : ('/{-$locale}/admin/testimonials/cook/$cookTestimonialId' as const);
    const params =
        testimonial.kind === 'customer'
            ? { customerTestimonialId: testimonial.testimonialId }
            : { cookTestimonialId: testimonial.testimonialId };

    return (
        <Link
            to={to}
            params={params}
            className={cn(
                'flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm',
                bookingRequestCardInteractionClassName,
            )}
        >
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{kindLabel}</Badge>
                <Badge variant={testimonial.publicationStatus === 'PUBLISHED' ? 'default' : 'outline'}>
                    {publicationLabel(testimonial.publicationStatus, locale)}
                </Badge>
                <span className="text-xs text-muted-foreground">{createdLabel}</span>
            </div>
            <p className="line-clamp-1 font-medium text-foreground">{testimonial.displayAuthorName}</p>
            {testimonial.displayOccasion || testimonial.displayLocation ? (
                <p className="truncate text-sm text-muted-foreground">
                    {[testimonial.displayOccasion, testimonial.displayLocation].filter(Boolean).join(' · ')}
                </p>
            ) : null}
            {testimonial.body ? <p className="line-clamp-3 text-sm text-muted-foreground">{testimonial.body}</p> : null}
            {testimonial.rating != null ? (
                <p className="mt-auto text-xs text-muted-foreground">
                    {{ de: `Bewertung ${testimonial.rating}/5`, en: `Rating ${testimonial.rating}/5` }[locale]}
                </p>
            ) : (
                <span className="mt-auto" />
            )}
        </Link>
    );
}
