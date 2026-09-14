/** 60 minutes before start — mic/camera check. */
const CALL_JOIN_PRE_BUFFER_MS = 60 * 60_000;
/** 15 minutes after end — late joiners / overruns. */
const CALL_JOIN_POST_GRACE_MS = 15 * 60_000;

interface JoinableBooking {
    readonly startAt: string | Date;
    readonly endAt: string | Date;
    readonly status: string;
}

/**
 * Window in which a CONFIRMED scheduled call should expose a join CTA:
 * 60 minutes before startAt through 15 minutes after endAt.
 */
export function isCallJoinable(booking: JoinableBooking, now: Date = new Date()): boolean {
    if (booking.status !== 'CONFIRMED') {
        return false;
    }
    const start = new Date(booking.startAt).getTime() - CALL_JOIN_PRE_BUFFER_MS;
    const end = new Date(booking.endAt).getTime() + CALL_JOIN_POST_GRACE_MS;
    const nowMs = now.getTime();
    return nowMs >= start && nowMs <= end;
}
