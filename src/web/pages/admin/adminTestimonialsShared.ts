import { t } from '../../../i18n/t';
import type { GqlCTestimonialPublicationStatus } from '../../graphql/generated';
import type { Locale } from '../../utils/locale';

export type AdminTestimonialType = 'CUSTOMER' | 'COOK';

export function testimonialTypeLabel(type: AdminTestimonialType, locale: Locale): string {
    return t(locale, 'admin', `testimonials.${type}`);
}

export function testimonialPublicationStatusLabel(status: GqlCTestimonialPublicationStatus, locale: Locale): string {
    return t(locale, 'admin', `testimonials.${status}`);
}
