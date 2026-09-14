import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestExpireNotify } from '../jobs/handlers/bookingRequestExpireNotify';

/**
 * Cancels any pending expire-notify job for this booking request (found by
 * payload). Safe when none exist.
 */
export async function bookingRequestExpireNotifyCancel(serverRuntime: ServerRuntime, bookingRequestId: string): Promise<void> {
    const jobs = await serverRuntime.jobs.findByData(bookingRequestExpireNotify, { bookingRequestId });
    await Promise.all(jobs.map((job) => serverRuntime.jobs.cancel(bookingRequestExpireNotify.name, job.id).catch(() => undefined)));
}

/**
 * Schedule (or re-schedule) the expire-notify job at `expiresAt`. Cancels any
 * prior pending job first. Skips when `expiresAt` is null or already past.
 */
export async function bookingRequestExpireNotifySchedule(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; expiresAt: Date | null },
): Promise<void> {
    await bookingRequestExpireNotifyCancel(serverRuntime, args.bookingRequestId);

    if (args.expiresAt == null || args.expiresAt.getTime() <= Date.now()) {
        return;
    }

    await serverRuntime.jobs.enqueue(
        bookingRequestExpireNotify,
        { bookingRequestId: args.bookingRequestId },
        { startAfter: args.expiresAt },
    );
}
