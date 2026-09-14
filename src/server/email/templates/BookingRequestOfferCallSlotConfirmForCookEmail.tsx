import {
    BookingRequestOfferCallSlotConfirmBody,
    bookingRequestOfferCallSlotConfirmEmailSubject,
} from '../components/BookingRequestOfferCallSlotConfirmBody';
import type { BookingRequestOfferCallSlotConfirmBodyProps } from '../components/BookingRequestOfferCallSlotConfirmBody';

export function BookingRequestOfferCallSlotConfirmForCookEmail(props: BookingRequestOfferCallSlotConfirmBodyProps) {
    return <BookingRequestOfferCallSlotConfirmBody {...props} />;
}

export function bookingRequestOfferCallSlotConfirmForCookEmailSubject(
    locale: BookingRequestOfferCallSlotConfirmBodyProps['locale'],
): string {
    return bookingRequestOfferCallSlotConfirmEmailSubject(locale);
}
