import { tEmail } from '../../../i18n/tEmail';
import type { Locale } from '../../../shared/locale';

export type BookingRequestOfferTestimonialReminderKind = 'MEMORY_NUDGE' | 'REMINDER_MORNING' | 'REMINDER_EVENING';

type TestimonialReminderAudience = 'CUSTOMER' | 'COOK';

export function bookingRequestOfferTestimonialReminderCopyFor(
    locale: Locale,
    kind: BookingRequestOfferTestimonialReminderKind,
    audience: TestimonialReminderAudience,
    counterpartyFirstName: string,
): { preview: string; body: string; linkLabel: string } {
    if (kind === 'MEMORY_NUDGE') {
        return {
            preview: tEmail(locale, 'testimonial.memory.preview', { counterpartyFirstName }),
            body: tEmail(locale, audience === 'CUSTOMER' ? 'testimonial.memory.bodyCustomer' : 'testimonial.memory.bodyCook', {
                counterpartyFirstName,
            }),
            linkLabel: tEmail(locale, 'testimonial.memory.cta'),
        };
    }

    const isEvening = kind === 'REMINDER_EVENING';
    return {
        preview: tEmail(locale, isEvening ? 'testimonial.review.previewEvening' : 'testimonial.review.previewMorning', {
            counterpartyFirstName,
        }),
        body: tEmail(locale, audience === 'CUSTOMER' ? 'testimonial.review.bodyCustomer' : 'testimonial.review.bodyCook', {
            counterpartyFirstName,
        }),
        linkLabel: tEmail(locale, 'testimonial.review.cta'),
    };
}

export function bookingRequestOfferTestimonialReminderEmailSubject(
    locale: Locale,
    kind: BookingRequestOfferTestimonialReminderKind,
): string {
    if (kind === 'MEMORY_NUDGE') {
        return tEmail(locale, 'testimonial.memory.subject');
    }
    if (kind === 'REMINDER_EVENING') {
        return tEmail(locale, 'testimonial.review.subjectEvening');
    }
    return tEmail(locale, 'testimonial.review.subjectMorning');
}
