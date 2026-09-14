import {
    BookingRequestOfferCallSlotConfirmBody,
    bookingRequestOfferCallSlotConfirmEmailSubject,
} from '../components/BookingRequestOfferCallSlotConfirmBody';
import type { BookingRequestOfferCallSlotConfirmBodyProps } from '../components/BookingRequestOfferCallSlotConfirmBody';

export function BookingRequestOfferCallSlotConfirmForCustomerEmail(props: BookingRequestOfferCallSlotConfirmBodyProps) {
    return <BookingRequestOfferCallSlotConfirmBody {...props} />;
}

export function bookingRequestOfferCallSlotConfirmForCustomerEmailSubject(
    locale: BookingRequestOfferCallSlotConfirmBodyProps['locale'],
): string {
    return bookingRequestOfferCallSlotConfirmEmailSubject(locale);
}
