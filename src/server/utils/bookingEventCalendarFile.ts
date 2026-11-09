import { eq } from 'drizzle-orm';

import { bookingEventCalendarIcs } from '../../shared/calendarEventContent';
import type { Locale } from '../../shared/locale';
import { timeZoneFromCountry } from '../../shared/timeZone';
import { bookingRequestParticipants, bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestEmailCookOfferUrl, bookingRequestEmailCustomerRequestUrl } from '../email/components/bookingRequestEmailUrls';
import { environmentVariables } from '../env/environmentVariablesCreate';

type CalendarFileAttachment = {
    filename: string;
    content: Buffer;
    mediaType: 'text/calendar;charset=utf-8';
};

function calendarFileAttachment(ics: string, filename: string): CalendarFileAttachment {
    return {
        filename,
        content: Buffer.from(ics, 'utf8'),
        mediaType: 'text/calendar;charset=utf-8',
    };
}

/** Customer received the evening file on the booking-confirmation email (card saved or paid, including €0). */
export function customerReceivedBookingEventCalendar(paymentStatus: string): boolean {
    return (
        paymentStatus === 'SETUP' || paymentStatus === 'PAYED' || paymentStatus === 'TRANSFERRED' || paymentStatus === 'PAYED_OUT_OF_SYSTEM'
    );
}

export async function bookingEventCalendarAttachment(
    serverRuntime: ServerRuntime,
    input: {
        bookingRequestId: string;
        locale: Locale;
        timeZone: string;
        peerName: string;
        audience: 'cook' | 'customer';
        bookingRequestOfferId: string;
    },
): Promise<CalendarFileAttachment | null> {
    const [request] = await serverRuntime.db
        .select({
            occasion: bookingRequests.occasion,
            dateTime: bookingRequests.dateTime,
            displayText: bookingRequests.exactEventAddress,
        })
        .from(bookingRequests)
        .where(eq(bookingRequests.bookingRequestId, input.bookingRequestId))
        .limit(1);
    if (!request) return null;

    const participants = await serverRuntime.db
        .select({ bookingRequestParticipantId: bookingRequestParticipants.bookingRequestParticipantId })
        .from(bookingRequestParticipants)
        .where(eq(bookingRequestParticipants.bookingRequestId, input.bookingRequestId));

    const webPageUrl = environmentVariables.webPageUrl;
    const bookingUrl =
        input.audience === 'cook'
            ? bookingRequestEmailCookOfferUrl(webPageUrl, input.bookingRequestOfferId, 'offer')
            : bookingRequestEmailCustomerRequestUrl(webPageUrl, input.bookingRequestId);

    return calendarFileAttachment(
        bookingEventCalendarIcs({
            locale: input.locale,
            timeZone: timeZoneFromCountry(request.displayText.country),
            venueCity: request.displayText.city,
            occasion: request.occasion,
            peerName: input.peerName,
            guestCount: participants.length,
            start: request.dateTime,
            location: request.displayText.displayText,
            bookingUrl,
            bookingRequestId: input.bookingRequestId,
        }),
        'peopleeat-event.ics',
    );
}
