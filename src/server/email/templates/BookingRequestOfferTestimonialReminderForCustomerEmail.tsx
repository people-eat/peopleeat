import type { Locale } from '../../../shared/locale';
import { EmailButton, EmailLayout, EmailText } from '../components';
import {
    bookingRequestOfferTestimonialReminderCopyFor,
    bookingRequestOfferTestimonialReminderEmailSubject,
} from '../components/bookingRequestOfferTestimonialReminderEmailShared';
import type { BookingRequestOfferTestimonialReminderKind } from '../components/bookingRequestOfferTestimonialReminderEmailShared';

export type { BookingRequestOfferTestimonialReminderKind };

interface BookingRequestOfferTestimonialReminderForCustomerEmailProps {
    locale: Locale;
    webPageUrl: string;
    recipientFirstName?: string;
    counterpartyFirstName: string;
    primaryUrl: string;
    kind: BookingRequestOfferTestimonialReminderKind;
}

export function BookingRequestOfferTestimonialReminderForCustomerEmail({
    locale,
    webPageUrl,
    recipientFirstName,
    counterpartyFirstName,
    primaryUrl,
    kind,
}: BookingRequestOfferTestimonialReminderForCustomerEmailProps) {
    const { preview, body, linkLabel } = bookingRequestOfferTestimonialReminderCopyFor(locale, kind, 'CUSTOMER', counterpartyFirstName);
    const subject = bookingRequestOfferTestimonialReminderForCustomerEmailSubject(locale, kind);

    return (
        <EmailLayout locale={locale} webPageUrl={webPageUrl} preview={preview} subject={subject} recipientFirstName={recipientFirstName}>
            <EmailText>{body}</EmailText>
            <EmailButton href={primaryUrl}>{linkLabel}</EmailButton>
        </EmailLayout>
    );
}

export function bookingRequestOfferTestimonialReminderForCustomerEmailSubject(
    locale: Locale,
    kind: BookingRequestOfferTestimonialReminderKind,
): string {
    return bookingRequestOfferTestimonialReminderEmailSubject(locale, kind);
}
