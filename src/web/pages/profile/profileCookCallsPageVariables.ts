/** ISO date `YYYY-MM-DD` in the local calendar. */
export function toIsoDateLocal(date: Date): string {
    const year = date.getFullYear().toString().padStart(4, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/** Loader / subscription range: today inclusive through +90 days exclusive. */
export function profileCookCallsPageVariables(): { exceptionsFrom: string; exceptionsTo: string } {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 90);
    return { exceptionsFrom: toIsoDateLocal(from), exceptionsTo: toIsoDateLocal(to) };
}
