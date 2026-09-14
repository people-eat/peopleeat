import {
    BookingRequestOfferCallSlotDeclineBody,
    bookingRequestOfferCallSlotDeclineEmailSubject,
} from '../components/BookingRequestOfferCallSlotDeclineBody';
import type { BookingRequestOfferCallSlotDeclineBodyProps } from '../components/BookingRequestOfferCallSlotDeclineBody';

export function BookingRequestOfferCallSlotDeclineForCustomerEmail(props: BookingRequestOfferCallSlotDeclineBodyProps) {
    return <BookingRequestOfferCallSlotDeclineBody {...props} />;
}

export function bookingRequestOfferCallSlotDeclineForCustomerEmailSubject(
    locale: BookingRequestOfferCallSlotDeclineBodyProps['locale'],
): string {
    return bookingRequestOfferCallSlotDeclineEmailSubject(locale);
}
