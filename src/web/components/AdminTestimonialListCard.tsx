import { Link } from '@tanstack/react-router';

import { formatDate } from '../../shared';
import type { GqlCTestimonialPublicationStatus } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import { cn } from '../utils/cn';
import { Badge } from './base/badge';
import { bookingRequestCardInteractionClassName } from './bookingRequestCardInteraction';
import { PageTestimonialCardFace } from './PageTestimonialCard';

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
    imageUrls: ReadonlyArray<string>;
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
    const editLabel = { de: 'Bearbeiten', en: 'Edit' }[locale];
    const body = testimonial.body?.trim() || { de: '(ohne Text)', en: '(no body)' }[locale];
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
                'flex h-full flex-col rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm',
                bookingRequestCardInteractionClassName,
            )}
        >
            <PageTestimonialCardFace
                testimonial={{
                    authorName: testimonial.displayAuthorName,
                    location: testimonial.displayLocation,
                    occasion: testimonial.displayOccasion,
                    body,
                    rating: testimonial.rating,
                    imageUrls: testimonial.imageUrls,
                }}
                header={
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{kindLabel}</Badge>
                        <Badge variant={testimonial.publicationStatus === 'PUBLISHED' ? 'default' : 'outline'}>
                            {publicationLabel(testimonial.publicationStatus, locale)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{createdLabel}</span>
                    </div>
                }
                footerAction={<span className="shrink-0 text-sm font-medium text-accent">{editLabel}</span>}
            />
        </Link>
    );
}
