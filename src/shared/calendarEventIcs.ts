/**
 * RFC 5545 calendar file (METHOD:PUBLISH). A download or email attachment adds a
 * personal copy. It does not update or remove an entry the person already saved.
 */

export type CalendarEventIcsInput = {
    start: Date;
    end: Date;
    title: string;
    description: string;
    /** Stable identifier for this event. */
    uid: string;
    location?: string;
    url?: string;
    /** DISPLAY alarm this many minutes before start. Omit for no alarm. */
    alarmMinutesBefore?: number;
    /** DTSTAMP. Defaults to the current time. */
    stampedAt?: Date;
};

function pad2(value: number): string {
    return value.toString().padStart(2, '0');
}

/** Format a Date as `YYYYMMDDTHHMMSSZ` UTC. */
function formatIcsDate(date: Date): string {
    return (
        `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}` +
        `T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`
    );
}

/** Escape iCalendar TEXT values per RFC 5545. */
function escapeIcsText(text: string): string {
    return text.replace(/\\/gu, '\\\\').replace(/\n/gu, '\\n').replace(/,/gu, '\\,').replace(/;/gu, '\\;');
}

/** Fold a content line at 75 octets. Continuations begin with a single space. */
function foldContentLine(line: string): string {
    const encoder = new TextEncoder();
    if (encoder.encode(line).length <= 75) {
        return line;
    }
    const chunks: string[] = [];
    let current = '';
    let currentBytes = 0;
    for (const char of line) {
        const charBytes = encoder.encode(char).length;
        const maxBytes = chunks.length === 0 ? 75 : 74;
        if (current.length > 0 && currentBytes + charBytes > maxBytes) {
            chunks.push(current);
            current = char;
            currentBytes = charBytes;
        } else {
            current += char;
            currentBytes += charBytes;
        }
    }
    if (current.length > 0) {
        chunks.push(current);
    }
    return chunks.map((chunk, index) => (index === 0 ? chunk : ` ${chunk}`)).join('\r\n');
}

export function calendarEventIcs({
    start,
    end,
    title,
    description,
    uid,
    location,
    url,
    alarmMinutesBefore,
    stampedAt = new Date(),
}: CalendarEventIcsInput): string {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//peopleeat//calendar//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${formatIcsDate(stampedAt)}`,
        `DTSTART:${formatIcsDate(start)}`,
        `DTEND:${formatIcsDate(end)}`,
        `SUMMARY:${escapeIcsText(title)}`,
        `DESCRIPTION:${escapeIcsText(description)}`,
        'STATUS:CONFIRMED',
    ];
    const trimmedLocation = location?.trim();
    if (trimmedLocation) {
        lines.push(`LOCATION:${escapeIcsText(trimmedLocation)}`);
    }
    const trimmedUrl = url?.trim();
    if (trimmedUrl) {
        lines.push(`URL:${escapeIcsText(trimmedUrl)}`);
    }
    if (alarmMinutesBefore != null && alarmMinutesBefore > 0) {
        lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `TRIGGER:-PT${Math.round(alarmMinutesBefore)}M`, 'DESCRIPTION:Reminder', 'END:VALARM');
    }
    lines.push('END:VEVENT', 'END:VCALENDAR');
    return `${lines.map(foldContentLine).join('\r\n')}\r\n`;
}
