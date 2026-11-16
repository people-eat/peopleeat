import { t } from '../i18n/t';
import { cookCallSlotBookingWhenFormat } from './cookCallSlotBookingStatus';
import { formatDate, formatDateTime, formatTime } from './formatDate';
import type { Locale } from './locale';
import { formatTimeZonePlaceLabel, timeZoneFromCountry, timeZoneOffsetAt, timeZonesDifferAt } from './timeZone';

export type BookingWhenFormatted = {
    primary: string;
    secondary?: string;
};

export type BookingWhenPeer = {
    name: string;
    timeZone: string;
};

function placeLabel(venueCity: string | null | undefined, timeZone: string): string {
    const city = venueCity?.trim() ?? '';
    if (city.length > 0) return city;
    return formatTimeZonePlaceLabel(timeZone);
}

function callRangeLabel(start: string | Date, end: string | Date, locale: Locale, timeZone: string): string {
    const range = `${formatTime(start, { locale, timeZone })}–${formatTime(end, { locale, timeZone })}`;
    return t(locale, 'common', 'bookingWhen.callRange', { range });
}

function durationParts(deltaMinutes: number): { hours: number; minutes: number } {
    const abs = Math.abs(Math.round(deltaMinutes));
    return { hours: Math.floor(abs / 60), minutes: abs % 60 };
}

function formatOffsetDuration(deltaMinutes: number, locale: Locale): string {
    const { hours, minutes } = durationParts(deltaMinutes);
    const parts: string[] = [];
    if (hours > 0) parts.push(t(locale, 'common', 'bookingWhen.hours', { count: hours }));
    if (minutes > 0) parts.push(t(locale, 'common', 'bookingWhen.minutes', { count: minutes }));
    return parts.join(' ');
}

function formatOffsetRelative(deltaMinutes: number, locale: Locale): string {
    const duration = formatOffsetDuration(deltaMinutes, locale);
    if (deltaMinutes < 0) {
        return t(locale, 'common', 'bookingWhen.behind', { duration });
    }
    return t(locale, 'common', 'bookingWhen.ahead', { duration });
}

function viewerTimeSecondary(instant: string | Date, locale: Locale, viewerTimeZone: string): string {
    const time = formatTime(instant, { locale, timeZone: viewerTimeZone, timeStyle: 'short' });
    return t(locale, 'common', 'bookingWhen.viewerTime', { time });
}

/** Join primary + optional secondary for emails, WhatsApp, and compact pills. */
export function formatBookingWhenJoined(formatted: BookingWhenFormatted, separator = ' · '): string {
    return formatted.secondary != null && formatted.secondary.length > 0
        ? `${formatted.primary}${separator}${formatted.secondary}`
        : formatted.primary;
}

/**
 * In-person event: primary is always venue-local. A city suffix and “your time”
 * line appear only when the viewer’s offset differs at that instant.
 */
export function formatBookingEventWhen(input: {
    instant: string | Date;
    locale: Locale;
    viewerTimeZone: string;
    venueTimeZone: string;
    venueCity?: string | null;
    dateStyle?: 'full' | 'long' | 'medium';
}): BookingWhenFormatted {
    const { instant, locale, viewerTimeZone, venueTimeZone, venueCity, dateStyle = 'full' } = input;
    const primary = formatDateTime(instant, { locale, timeZone: venueTimeZone, dateStyle, timeStyle: 'short' });
    if (!timeZonesDifferAt(instant, viewerTimeZone, venueTimeZone)) {
        return { primary };
    }
    const place = placeLabel(venueCity, venueTimeZone);
    return {
        primary: place.length > 0 ? `${primary} in ${place}` : primary,
        secondary: viewerTimeSecondary(instant, locale, viewerTimeZone),
    };
}

/**
 * Admin event: venue-local primary, plus each party whose offset differs from
 * the venue (IANA ids are allowed on admin).
 */
export function formatBookingEventWhenAdmin(input: {
    instant: string | Date;
    locale: Locale;
    venueTimeZone: string;
    venueCity?: string | null;
    customerTimeZone: string;
    cookTimeZone: string;
    viewerTimeZone?: string;
}): BookingWhenFormatted {
    const { instant, locale, venueTimeZone, venueCity, customerTimeZone, cookTimeZone, viewerTimeZone } = input;
    const base = formatDateTime(instant, { locale, timeZone: venueTimeZone, dateStyle: 'full', timeStyle: 'short' });
    const customerDiffers = timeZonesDifferAt(instant, customerTimeZone, venueTimeZone);
    const cookDiffers = timeZonesDifferAt(instant, cookTimeZone, venueTimeZone);
    const viewerDiffers = viewerTimeZone != null && timeZonesDifferAt(instant, viewerTimeZone, venueTimeZone);
    if (!customerDiffers && !cookDiffers && !viewerDiffers) {
        return { primary: base };
    }
    const place = placeLabel(venueCity, venueTimeZone);
    const primary = place.length > 0 ? `${base} in ${place}` : base;
    const lines: string[] = [];
    if (customerDiffers) {
        const time = formatTime(instant, { locale, timeZone: customerTimeZone, timeStyle: 'short' });
        lines.push(t(locale, 'common', 'bookingWhen.customerLine', { time, timeZone: customerTimeZone }));
    }
    if (cookDiffers) {
        const time = formatTime(instant, { locale, timeZone: cookTimeZone, timeStyle: 'short' });
        lines.push(t(locale, 'common', 'bookingWhen.cookLine', { time, timeZone: cookTimeZone }));
    }
    if (viewerDiffers) {
        lines.push(viewerTimeSecondary(instant, locale, viewerTimeZone));
    }
    return { primary, secondary: lines.join('\n') };
}

/**
 * Virtual call: primary is the viewer’s local window. A peer line appears only
 * when that peer’s offset differs at start.
 */
export function formatBookingCallWhen(input: {
    startAt: string | Date;
    endAt: string | Date;
    locale: Locale;
    viewerTimeZone: string;
    peers?: readonly BookingWhenPeer[];
}): BookingWhenFormatted {
    const { startAt, endAt, locale, viewerTimeZone, peers = [] } = input;
    const primary = cookCallSlotBookingWhenFormat({ startAt, endAt }, locale, viewerTimeZone);
    const lines: string[] = [];
    for (const peer of peers) {
        const name = peer.name.trim();
        if (name.length === 0) continue;
        if (!timeZonesDifferAt(startAt, viewerTimeZone, peer.timeZone)) continue;
        const range = callRangeLabel(startAt, endAt, locale, peer.timeZone);
        const place = formatTimeZonePlaceLabel(peer.timeZone);
        lines.push(t(locale, 'common', 'bookingWhen.peerRange', { range, name, place }));
    }
    if (lines.length === 0) return { primary };
    return { primary, secondary: lines.join('\n') };
}

/**
 * Caption above a call slot picker. Null when every peer shares the viewer’s
 * offset at `instant` (defaults to now).
 */
export function formatBookingCallScheduleCaption(input: {
    locale: Locale;
    viewerTimeZone: string;
    peers: readonly BookingWhenPeer[];
    instant?: string | Date;
}): string | null {
    const { locale, viewerTimeZone, peers } = input;
    const instant = input.instant ?? new Date();
    const clauses: string[] = [];
    for (const peer of peers) {
        const name = peer.name.trim();
        if (name.length === 0) continue;
        if (!timeZonesDifferAt(instant, viewerTimeZone, peer.timeZone)) continue;
        const delta = timeZoneOffsetAt(instant, peer.timeZone) - timeZoneOffsetAt(instant, viewerTimeZone);
        const place = formatTimeZonePlaceLabel(peer.timeZone);
        const relative = formatOffsetRelative(delta, locale);
        clauses.push(t(locale, 'common', 'bookingWhen.peerClause', { name, place, relative }));
    }
    if (clauses.length === 0) return null;
    const intro = t(locale, 'common', 'bookingWhen.scheduleIntro');
    return `${intro} ${clauses.join(' ')}`;
}

/** Date-only event label in the venue zone so the calendar day cannot split. */
export function formatBookingEventDate(input: {
    instant: string | Date;
    locale: Locale;
    venueTimeZone: string;
    dateStyle?: 'full' | 'long' | 'medium';
    weekday?: boolean;
}): string {
    const { instant, locale, venueTimeZone, dateStyle = 'full', weekday } = input;
    return formatDate(instant, { locale, timeZone: venueTimeZone, dateStyle, weekday });
}

export function formatBookingEventTime(input: { instant: string | Date; locale: Locale; venueTimeZone: string }): string {
    return formatTime(input.instant, { locale: input.locale, timeZone: input.venueTimeZone, timeStyle: 'short' });
}

/** Event when-label from a Places country (DACH → Berlin family). */
export function formatBookingEventWhenFromCountry(input: {
    instant: string | Date;
    locale: Locale;
    viewerTimeZone: string;
    venueCountry?: string | null;
    venueCity?: string | null;
    dateStyle?: 'full' | 'long' | 'medium';
}): BookingWhenFormatted {
    return formatBookingEventWhen({
        instant: input.instant,
        locale: input.locale,
        viewerTimeZone: input.viewerTimeZone,
        venueTimeZone: timeZoneFromCountry(input.venueCountry),
        venueCity: input.venueCity,
        dateStyle: input.dateStyle,
    });
}

export function formatBookingEventDateFromCountry(input: {
    instant: string | Date;
    locale: Locale;
    venueCountry?: string | null;
    dateStyle?: 'full' | 'long' | 'medium';
    weekday?: boolean;
}): string {
    return formatBookingEventDate({
        instant: input.instant,
        locale: input.locale,
        venueTimeZone: timeZoneFromCountry(input.venueCountry),
        dateStyle: input.dateStyle,
        weekday: input.weekday,
    });
}

export function formatBookingEventWhenAdminFromCountry(input: {
    instant: string | Date;
    locale: Locale;
    venueCountry?: string | null;
    venueCity?: string | null;
    customerTimeZone: string;
    cookTimeZone: string;
    viewerTimeZone?: string;
}): BookingWhenFormatted {
    return formatBookingEventWhenAdmin({
        instant: input.instant,
        locale: input.locale,
        venueTimeZone: timeZoneFromCountry(input.venueCountry),
        venueCity: input.venueCity,
        customerTimeZone: input.customerTimeZone,
        cookTimeZone: input.cookTimeZone,
        viewerTimeZone: input.viewerTimeZone,
    });
}
