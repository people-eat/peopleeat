import {
    BookingRequestOfferCallSlotCancelBody,
    bookingRequestOfferCallSlotCancelEmailSubject,
} from '../components/BookingRequestOfferCallSlotCancelBody';
import type { BookingRequestOfferCallSlotCancelBodyProps } from '../components/BookingRequestOfferCallSlotCancelBody';

export function BookingRequestOfferCallSlotCancelForCustomerEmail(props: BookingRequestOfferCallSlotCancelBodyProps) {
    return <BookingRequestOfferCallSlotCancelBody {...props} />;
}

export function bookingRequestOfferCallSlotCancelForCustomerEmailSubject(
    locale: BookingRequestOfferCallSlotCancelBodyProps['locale'],
): string {
    return bookingRequestOfferCallSlotCancelEmailSubject(locale);
}
