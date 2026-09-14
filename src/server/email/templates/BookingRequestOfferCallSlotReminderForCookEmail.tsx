import {
    BookingRequestOfferCallSlotReminderBody,
    bookingRequestOfferCallSlotReminderEmailSubject,
} from '../components/BookingRequestOfferCallSlotReminderBody';
import type { BookingRequestOfferCallSlotReminderBodyProps } from '../components/BookingRequestOfferCallSlotReminderBody';

export function BookingRequestOfferCallSlotReminderForCookEmail(props: BookingRequestOfferCallSlotReminderBodyProps) {
    return <BookingRequestOfferCallSlotReminderBody {...props} />;
}

export function bookingRequestOfferCallSlotReminderForCookEmailSubject(
    locale: BookingRequestOfferCallSlotReminderBodyProps['locale'],
): string {
    return bookingRequestOfferCallSlotReminderEmailSubject(locale);
}
