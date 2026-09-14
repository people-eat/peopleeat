import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestNoOffersNotify } from '../jobs/handlers/bookingRequestNoOffersNotify';
import type { BookingRequestNoOffersNotifyHours } from '../jobs/handlers/bookingRequestNoOffersNotify';

const NO_OFFER_HOURS: BookingRequestNoOffersNotifyHours[] = [24, 48];

/**
 * Cancels any pending 24h / 48h no-offers Slack jobs for this booking request.
 */
export async function bookingRequestNoOffersNotifyCancel(serverRuntime: ServerRuntime, bookingRequestId: string): Promise<void> {
    const jobs = await serverRuntime.jobs.findByData(bookingRequestNoOffersNotify, { bookingRequestId });
    await Promise.all(jobs.map((job) => serverRuntime.jobs.cancel(bookingRequestNoOffersNotify.name, job.id).catch(() => undefined)));
}

/**
 * Schedule (or re-schedule) 24h and 48h no-offer Slack alerts from `createdAt`.
 * Cancels any prior pending jobs first. Due times already in the past are skipped.
 */
export async function bookingRequestNoOffersNotifySchedule(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; createdAt: Date },
): Promise<void> {
    await bookingRequestNoOffersNotifyCancel(serverRuntime, args.bookingRequestId);

    const now = Date.now();
    await Promise.all(
        NO_OFFER_HOURS.map(async (hours) => {
            const startAfter = new Date(args.createdAt.getTime() + hours * 60 * 60 * 1000);
            if (startAfter.getTime() <= now) {
                return;
            }
            await serverRuntime.jobs.enqueue(
                bookingRequestNoOffersNotify,
                { bookingRequestId: args.bookingRequestId, hours },
                { startAfter },
            );
        }),
    );
}
