import type { ReactNode } from 'react';

import { bookingEventCalendarIcsInput } from '../../shared/calendarEventContent';
import { downloadCalendarEvent } from '../utils/downloadCalendarEvent';
import type { Locale } from '../utils/locale';
import { AddToCalendarLink } from './AddToCalendarLink';

export function BookingEventCalendarLink({
    locale,
    whenLabel,
    timeZone,
    occasion,
    peerName,
    guestCount,
    start,
    location,
    bookingPath,
    bookingRequestId,
    venueCity,
}: {
    locale: Locale;
    whenLabel: ReactNode;
    timeZone: string;
    occasion: string;
    peerName: string;
    guestCount: number;
    start: string | Date;
    location: string;
    bookingPath: string;
    bookingRequestId: string;
    venueCity?: string | null;
}) {
    return (
        <AddToCalendarLink
            locale={locale}
            whenLabel={whenLabel}
            onClick={() => {
                const bookingUrl = new URL(bookingPath, window.location.origin).href;
                downloadCalendarEvent({
                    filename: 'peopleeat-event.ics',
                    ...bookingEventCalendarIcsInput({
                        locale,
                        timeZone,
                        venueCity,
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
