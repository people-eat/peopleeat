import type { GqlCTestimonialPublicationStatus } from '../../graphql/generated';
import type { Locale } from '../../utils/locale';

export type AdminTestimonialType = 'CUSTOMER' | 'COOK';

export function testimonialTypeLabel(type: AdminTestimonialType, locale: Locale): string {
    return {
        CUSTOMER: { de: 'Kunde', en: 'Customer' },
        COOK: { de: 'Koch', en: 'Cook' },
    }[type][locale];
}

export function testimonialPublicationStatusLabel(status: GqlCTestimonialPublicationStatus, locale: Locale): string {
    return {
        PUBLISHED: { de: 'Veröffentlicht', en: 'Published' },
        PENDING_REVIEW: { de: 'Ausstehend', en: 'Pending review' },
    }[status][locale];
}
