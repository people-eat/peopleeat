import {
    BookingRequestOfferCallSlotDeclineBody,
    bookingRequestOfferCallSlotDeclineEmailSubject,
} from '../components/BookingRequestOfferCallSlotDeclineBody';
import type { BookingRequestOfferCallSlotDeclineBodyProps } from '../components/BookingRequestOfferCallSlotDeclineBody';

export function BookingRequestOfferCallSlotDeclineForCookEmail(props: BookingRequestOfferCallSlotDeclineBodyProps) {
    return <BookingRequestOfferCallSlotDeclineBody {...props} />;
}

export function bookingRequestOfferCallSlotDeclineForCookEmailSubject(
    locale: BookingRequestOfferCallSlotDeclineBodyProps['locale'],
): string {
    return bookingRequestOfferCallSlotDeclineEmailSubject(locale);
}
