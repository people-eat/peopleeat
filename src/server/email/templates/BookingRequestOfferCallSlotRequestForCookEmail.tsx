import {
    BookingRequestOfferCallSlotRequestBody,
    bookingRequestOfferCallSlotRequestEmailSubject,
} from '../components/BookingRequestOfferCallSlotRequestBody';
import type { BookingRequestOfferCallSlotRequestBodyProps } from '../components/BookingRequestOfferCallSlotRequestBody';

export function BookingRequestOfferCallSlotRequestForCookEmail(props: BookingRequestOfferCallSlotRequestBodyProps) {
    return <BookingRequestOfferCallSlotRequestBody {...props} />;
}

export function bookingRequestOfferCallSlotRequestForCookEmailSubject(
    locale: BookingRequestOfferCallSlotRequestBodyProps['locale'],
): string {
    return bookingRequestOfferCallSlotRequestEmailSubject(locale);
}
