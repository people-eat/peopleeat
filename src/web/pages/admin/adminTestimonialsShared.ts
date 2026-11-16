import { t } from '../../../i18n/t';
import type { GqlCTestimonialPublicationStatus } from '../../graphql/generated';
import type { Locale } from '../../utils/locale';

export type AdminTestimonialType = 'CUSTOMER' | 'COOK';

export function testimonialTypeLabel(type: AdminTestimonialType, locale: Locale): string {
    const labels = {
        CUSTOMER: t(locale, 'admin', 'testimonials.CUSTOMER'),
        COOK: t(locale, 'admin', 'testimonials.COOK'),
    } satisfies Record<AdminTestimonialType, string>;
    return labels[type];
}

export function testimonialPublicationStatusLabel(status: GqlCTestimonialPublicationStatus, locale: Locale): string {
    const labels = {
        PUBLISHED: t(locale, 'admin', 'testimonials.PUBLISHED'),
        PENDING_REVIEW: t(locale, 'admin', 'testimonials.PENDING_REVIEW'),
    } satisfies Record<GqlCTestimonialPublicationStatus, string>;
    return labels[status];
}
