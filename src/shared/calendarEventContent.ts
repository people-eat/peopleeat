import { calendarEventIcs } from './calendarEventIcs';
import type { CalendarEventIcsInput } from './calendarEventIcs';
import { formatTime } from './formatDate';
import type { Locale } from './locale';
import { formatTimeZonePlaceLabel } from './timeZone';

const CALL_CALENDAR_ALARM_MINUTES = 15;
const BOOKING_EVENT_DURATION_MS = 4 * 60 * 60 * 1000;
const BOOKING_EVENT_ALARM_MINUTES = 24 * 60;

function callCalendarUid(cookCallSlotBookingId: string): string {
    return `${cookCallSlotBookingId}@peopleeat`;
}

function bookingEventCalendarUid(bookingRequestId: string): string {
    return `booking-request-${bookingRequestId}@peopleeat`;
}

export function callCalendarEventIcsInput(input: {
    locale: Locale;
    peerName: string;
    occasion?: string | null;
    offerUrl: string;
    start: Date;
    end: Date;
    cookCallSlotBookingId: string;
    stampedAt?: Date;
}): CalendarEventIcsInput {
    const peer = input.peerName.trim() || { de: 'Gast', en: 'Guest' }[input.locale];
    const title = { de: `Gespräch mit ${peer}`, en: `Call with ${peer}` }[input.locale];
    const occasion = input.occasion?.trim() ?? '';
    const intro =
        occasion.length > 0 ? { de: `Kennenlerngespräch zu ${occasion}.`, en: `Intro call about ${occasion}.` }[input.locale] : '';
    const description = intro.length > 0 ? `${intro}\n${input.offerUrl}` : input.offerUrl;
    return {
        start: input.start,
        end: input.end,
        title,
        description,
        uid: callCalendarUid(input.cookCallSlotBookingId),
        url: input.offerUrl,
        alarmMinutesBefore: CALL_CALENDAR_ALARM_MINUTES,
        stampedAt: input.stampedAt,
    };
}

export function callCalendarEventIcs(input: Parameters<typeof callCalendarEventIcsInput>[0]): string {
    return calendarEventIcs(callCalendarEventIcsInput(input));
}

export function bookingEventCalendarIcsInput(input: {
    locale: Locale;
    timeZone: string;
    venueCity?: string | null;
    occasion: string;
    peerName: string;
    guestCount: number;
    start: Date;
    location?: string | null;
    bookingUrl: string;
    bookingRequestId: string;
    stampedAt?: Date;
}): CalendarEventIcsInput {
    const peer = input.peerName.trim() || { de: 'Gast', en: 'Guest' }[input.locale];
    const occasion = input.occasion.trim() || { de: 'Abendessen', en: 'Dinner' }[input.locale];
    const time = formatTime(input.start, { locale: input.locale, timeZone: input.timeZone, timeStyle: 'short' });
    const place = input.venueCity?.trim() || formatTimeZonePlaceLabel(input.timeZone);
    const timeWithPlace = place.length > 0 ? { de: `${time} in ${place}`, en: `${time} in ${place}` }[input.locale] : time;
    const description = {
        de: `Beginn um ${timeWithPlace}. Die Dauer stimmt ihr im Chat ab. Gäste: ${input.guestCount}.\n${input.bookingUrl}`,
        en: `Starts at ${timeWithPlace}. You agree the length in chat. Guests: ${input.guestCount}.\n${input.bookingUrl}`,
    }[input.locale];
    return {
        start: input.start,
        end: new Date(input.start.getTime() + BOOKING_EVENT_DURATION_MS),
        title: { de: `${occasion} mit ${peer}`, en: `${occasion} with ${peer}` }[input.locale],
        description,
        uid: bookingEventCalendarUid(input.bookingRequestId),
        location: input.location ?? undefined,
        url: input.bookingUrl,
        alarmMinutesBefore: BOOKING_EVENT_ALARM_MINUTES,
        stampedAt: input.stampedAt,
    };
}

export function bookingEventCalendarIcs(input: Parameters<typeof bookingEventCalendarIcsInput>[0]): string {
    return calendarEventIcs(bookingEventCalendarIcsInput(input));
}
