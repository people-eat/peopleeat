/** Wall-clock hour (0–23) in Europe/Berlin for a UTC instant. */
export function europeBerlinHour(at: Date): number {
    const hour = Number(
        new Intl.DateTimeFormat('en-US', {
            timeZone: 'Europe/Berlin',
            hour: 'numeric',
            hour12: false,
        }).format(at),
    );
    // Some engines emit 24 for midnight; normalize to 0.
    return hour === 24 ? 0 : hour;
}
