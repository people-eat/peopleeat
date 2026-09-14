import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';
import {
    bookingRequestOfferTestimonialReminderCopyFor,
    bookingRequestOfferTestimonialReminderEmailSubject,
} from '../components/bookingRequestOfferTestimonialReminderEmailShared';
import type { BookingRequestOfferTestimonialReminderKind } from '../components/bookingRequestOfferTestimonialReminderEmailShared';

export type { BookingRequestOfferTestimonialReminderKind };

interface BookingRequestOfferTestimonialReminderForCookEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    counterpartyFirstName: string;
    primaryUrl: string;
    kind: BookingRequestOfferTestimonialReminderKind;
}

export function BookingRequestOfferTestimonialReminderForCookEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    counterpartyFirstName,
    primaryUrl,
    kind,
}: BookingRequestOfferTestimonialReminderForCookEmailProps) {
    const { preview, body, linkLabel } = bookingRequestOfferTestimonialReminderCopyFor(locale, kind, 'COOK', counterpartyFirstName);
    const subject = bookingRequestOfferTestimonialReminderForCookEmailSubject(locale, kind);

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{body}</EmailText>
            <EmailButton href={primaryUrl}>{linkLabel}</EmailButton>
        </EmailLayout>
    );
}

export function bookingRequestOfferTestimonialReminderForCookEmailSubject(
    locale: Locale,
    kind: BookingRequestOfferTestimonialReminderKind,
): string {
    return bookingRequestOfferTestimonialReminderEmailSubject(locale, kind);
}
