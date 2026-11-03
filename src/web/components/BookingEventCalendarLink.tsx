import { bookingEventCalendarIcsInput } from '../../shared/calendarEventContent';
import { downloadCalendarEvent } from '../utils/downloadCalendarEvent';
import type { Locale } from '../utils/locale';
import { AddToCalendarLink } from './AddToCalendarLink';

export function BookingEventCalendarLink({
    locale,
    timeZone,
    occasion,
    peerName,
    guestCount,
    start,
    location,
    bookingPath,
    bookingRequestId,
}: {
    locale: Locale;
    timeZone: string;
    occasion: string;
    peerName: string;
    guestCount: number;
    start: string | Date;
    location: string;
    bookingPath: string;
    bookingRequestId: string;
}) {
    return (
        <AddToCalendarLink
            locale={locale}
            onClick={() => {
                const bookingUrl = new URL(bookingPath, window.location.origin).href;
                downloadCalendarEvent({
                    filename: 'peopleeat-event.ics',
                    ...bookingEventCalendarIcsInput({
                        locale,
                        timeZone,
                        occasion,
                        peerName,
                        guestCount,
                        start: new Date(start),
                        location,
                        bookingUrl,
                        bookingRequestId,
                    }),
                });
            }}
        />
    );
}
