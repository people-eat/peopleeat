import {
    BookingRequestOfferCallSlotCancelBody,
    bookingRequestOfferCallSlotCancelEmailSubject,
} from '../components/BookingRequestOfferCallSlotCancelBody';
import type { BookingRequestOfferCallSlotCancelBodyProps } from '../components/BookingRequestOfferCallSlotCancelBody';

export function BookingRequestOfferCallSlotCancelForCookEmail(props: BookingRequestOfferCallSlotCancelBodyProps) {
    return <BookingRequestOfferCallSlotCancelBody {...props} />;
}

export function bookingRequestOfferCallSlotCancelForCookEmailSubject(locale: BookingRequestOfferCallSlotCancelBodyProps['locale']): string {
    return bookingRequestOfferCallSlotCancelEmailSubject(locale);
}
