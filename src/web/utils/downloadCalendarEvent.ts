import { calendarEventIcs } from '../../shared/calendarEventIcs';
import type { CalendarEventIcsInput } from '../../shared/calendarEventIcs';

export type DownloadCalendarEventInput = CalendarEventIcsInput & {
    /** Filename for the downloaded `.ics`. Defaults to `peopleeat-event.ics`. */
    filename?: string;
};

/** Download a calendar file in the browser. A later download does not replace an entry already saved. */
export function downloadCalendarEvent({ filename = 'peopleeat-event.ics', ...event }: DownloadCalendarEventInput): void {
    const blob = new Blob([calendarEventIcs(event)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
