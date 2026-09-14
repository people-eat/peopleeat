/**
 * Generates an RFC 5545–compliant `.ics` file in the browser and triggers a download.
 * Works with Apple Calendar, Google Calendar, Outlook, and any standards-compliant client.
 *
 * Stable `uid`s are important: re-downloading the same booking should update the existing
 * calendar entry rather than creating a duplicate.
 */

function pad2(value: number): string {
    return value.toString().padStart(2, '0');
}

/** Format a Date as `YYYYMMDDTHHMMSSZ` UTC for iCalendar. */
function formatICSDate(date: Date): string {
    return (
        `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}` +
        `T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`
    );
}

/** Escape iCalendar TEXT fields per RFC 5545. */
function escapeICSText(text: string): string {
    return text.replace(/\\/gu, '\\\\').replace(/\n/gu, '\\n').replace(/,/gu, '\\,').replace(/;/gu, '\\;');
}

export type DownloadCalendarEventInput = {
    start: Date;
    end: Date;
    title: string;
    description: string;
    /** Stable identifier — re-downloads with the same uid update the existing calendar entry. */
    uid: string;
    /** Filename for the downloaded `.ics`. Defaults to `peopleeat-call.ics`. */
    filename?: string;
};

export function downloadCalendarEvent({
    start,
    end,
    title,
    description,
    uid,
    filename = 'peopleeat-call.ics',
}: DownloadCalendarEventInput): void {
    const dtstamp = formatICSDate(new Date());
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//peopleeat//call-scheduling//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${formatICSDate(start)}`,
        `DTEND:${formatICSDate(end)}`,
        `SUMMARY:${escapeICSText(title)}`,
        `DESCRIPTION:${escapeICSText(description)}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function callCalendarEventCopy(locale: 'de' | 'en'): {
    addToCalendar: string;
    titlePrefix: string;
    description: string;
} {
    return {
        de: {
            addToCalendar: 'Zum Kalender hinzufügen',
            titlePrefix: 'Gespräch mit',
            description: 'Geplantes Gespräch über People Eat',
        },
        en: {
            addToCalendar: 'Add to calendar',
            titlePrefix: 'Call with',
            description: 'Scheduled call via People Eat',
        },
    }[locale];
}
