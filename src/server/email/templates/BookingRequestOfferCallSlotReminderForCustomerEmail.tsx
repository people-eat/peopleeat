import {
    BookingRequestOfferCallSlotReminderBody,
    bookingRequestOfferCallSlotReminderEmailSubject,
} from '../components/BookingRequestOfferCallSlotReminderBody';
import type { BookingRequestOfferCallSlotReminderBodyProps } from '../components/BookingRequestOfferCallSlotReminderBody';

export function BookingRequestOfferCallSlotReminderForCustomerEmail(props: BookingRequestOfferCallSlotReminderBodyProps) {
    return <BookingRequestOfferCallSlotReminderBody {...props} />;
}

export function bookingRequestOfferCallSlotReminderForCustomerEmailSubject(
    locale: BookingRequestOfferCallSlotReminderBodyProps['locale'],
): string {
    return bookingRequestOfferCallSlotReminderEmailSubject(locale);
}
