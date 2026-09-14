/**
 * Calendar day of `eventDate` offset by `dayOffset`, at `hour` (0–23) in
 * Europe/Berlin wall clock, as a UTC Date.
 */
function eventCalendarDayOffsetAtHourBerlin(eventDate: Date, dayOffset: number, hour: number): Date {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Berlin',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    const parts = formatter.formatToParts(eventDate);
    const year = Number(parts.find((part) => part.type === 'year')?.value);
    const month = Number(parts.find((part) => part.type === 'month')?.value);
    const day = Number(parts.find((part) => part.type === 'day')?.value);

    // Noon UTC on the event's Berlin calendar day, then apply dayOffset.
    const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    noonUtc.setUTCDate(noonUtc.getUTCDate() + dayOffset);

    const targetYmd = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Berlin',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(noonUtc);

    let guess = new Date(`${targetYmd}T${String(hour).padStart(2, '0')}:00:00+01:00`);
    for (let i = 0; i < 3; i += 1) {
        const berlinHour = Number(
            new Intl.DateTimeFormat('en-US', {
                timeZone: 'Europe/Berlin',
                hour: 'numeric',
                hour12: false,
            }).format(guess),
        );
        const berlinYmd = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Berlin',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(guess);
        if (berlinYmd === targetYmd && berlinHour === hour) {
            return guess;
        }
        const deltaHours = hour - berlinHour;
        guess = new Date(guess.getTime() + deltaHours * 60 * 60 * 1000);
    }
    return guess;
}

/**
 * Day after `eventDate` at `hour` (0–23) in Europe/Berlin wall clock, as a UTC Date.
 */
export function dayAfterEventAtHourBerlin(eventDate: Date, hour: number): Date {
    return eventCalendarDayOffsetAtHourBerlin(eventDate, 1, hour);
}

/**
 * Day before `eventDate` at `hour` (0–23) in Europe/Berlin wall clock, as a UTC Date.
 */
export function dayBeforeEventAtHourBerlin(eventDate: Date, hour: number): Date {
    return eventCalendarDayOffsetAtHourBerlin(eventDate, -1, hour);
}
