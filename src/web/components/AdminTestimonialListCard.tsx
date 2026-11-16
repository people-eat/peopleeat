import { Link } from '@tanstack/react-router';

import { t } from '../../i18n/t';
import type { Locale } from '../../shared';
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

function publicationLabel(status: string, locale: Locale): string {
    if (status === 'PUBLISHED') return t(locale, 'admin', 'copy.published2');
    return t(locale, 'admin', 'copy.pendingReview2');
}

export function AdminTestimonialListCard({ testimonial }: { testimonial: AdminTestimonialListCardTestimonial }) {
    const locale = useLocale();
    const kindLabel = testimonial.kind === 'customer' ? t(locale, 'admin', 'copy.customer') : t(locale, 'admin', 'copy.cook');
    const editLabel = t(locale, 'admin', 'copy.edit');
    const body = testimonial.body?.trim() || t(locale, 'admin', 'copy.noBody');
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
