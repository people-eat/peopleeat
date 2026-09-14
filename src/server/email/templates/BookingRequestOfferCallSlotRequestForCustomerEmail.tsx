import {
    BookingRequestOfferCallSlotRequestBody,
    bookingRequestOfferCallSlotRequestEmailSubject,
} from '../components/BookingRequestOfferCallSlotRequestBody';
import type { BookingRequestOfferCallSlotRequestBodyProps } from '../components/BookingRequestOfferCallSlotRequestBody';

export function BookingRequestOfferCallSlotRequestForCustomerEmail(props: BookingRequestOfferCallSlotRequestBodyProps) {
    return <BookingRequestOfferCallSlotRequestBody {...props} />;
}

export function bookingRequestOfferCallSlotRequestForCustomerEmailSubject(
    locale: BookingRequestOfferCallSlotRequestBodyProps['locale'],
): string {
    return bookingRequestOfferCallSlotRequestEmailSubject(locale);
}
