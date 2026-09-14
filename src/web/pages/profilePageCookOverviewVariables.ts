/** Loader / subscription window for upcoming discovery calls on the cook overview. */
export function profilePageCookOverviewVariables(): {
    upcomingCallsFrom: string;
    upcomingCallsTo: string;
} {
    const from = new Date();
    // Floor to the minute so the subscription variables stay stable within a session.
    from.setSeconds(0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 14);
    return {
        upcomingCallsFrom: from.toISOString(),
        upcomingCallsTo: to.toISOString(),
    };
}
