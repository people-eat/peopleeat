import { Link } from '@tanstack/react-router';

import type { GqlCTestimonialPublicationStatus } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { AdminTestimonialPublicPagePlacementBadges } from './AdminTestimonialPublicPagePlacements';
import type { AdminTestimonialPublicPagePlacement } from './AdminTestimonialPublicPagePlacements';
import { Badge } from './base/badge';
import { StatusBadge } from './base/status-badge';
import { bookingRequestCardInteractionClassName } from './bookingRequestCardInteraction';
import { TestimonialCardFace } from './TestimonialCard';

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
    publicPagePlacements?: ReadonlyArray<AdminTestimonialPublicPagePlacement>;
};

function publicationLabel(status: string, locale: 'de' | 'en'): string {
    if (status === 'PUBLISHED') return { de: 'Veröffentlicht', en: 'Published' }[locale];
    return { de: 'Zur Prüfung', en: 'Pending review' }[locale];
}

export function AdminTestimonialListCard({ testimonial }: { testimonial: AdminTestimonialListCardTestimonial }) {
    const locale = useLocale();
    const kindLabel = testimonial.kind === 'customer' ? { de: 'Kunde', en: 'Customer' }[locale] : { de: 'Koch', en: 'Cook' }[locale];
    const editLabel = { de: 'Bearbeiten', en: 'Edit' }[locale];
    const body = testimonial.body?.trim() || { de: '(ohne Text)', en: '(no body)' }[locale];
    const publicationTone = testimonial.publicationStatus === 'PUBLISHED' ? 'success' : 'warning';
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
            <TestimonialCardFace
                testimonial={{
                    authorName: testimonial.displayAuthorName,
                    location: testimonial.displayLocation,
                    occasion: testimonial.displayOccasion,
                    body,
                    rating: testimonial.rating,
                    imageUrls: testimonial.imageUrls,
                    createdAt: testimonial.createdAt,
                }}
                header={
                    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                        <Badge variant="outline" className="shrink-0">
                            {kindLabel}
                        </Badge>
                        <StatusBadge tone={publicationTone} className="shrink-0">
                            {publicationLabel(testimonial.publicationStatus, locale)}
                        </StatusBadge>
                        <AdminTestimonialPublicPagePlacementBadges placements={testimonial.publicPagePlacements ?? []} />
                    </div>
                }
                footerAction={<span className="shrink-0 text-sm font-medium text-accent">{editLabel}</span>}
            />
        </Link>
    );
}
