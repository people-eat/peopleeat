import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestReactionReminder } from '../jobs/handlers/bookingRequestReactionReminder';

const REACTION_REMINDER_MS = 48 * 60 * 60 * 1000;

/** Cancel pending 48h reaction-reminder jobs for this booking request. */
export async function bookingRequestReactionReminderCancel(serverRuntime: ServerRuntime, bookingRequestId: string): Promise<void> {
    const jobs = await serverRuntime.jobs.findByData(bookingRequestReactionReminder, { bookingRequestId });
    await Promise.all(jobs.map((job) => serverRuntime.jobs.cancel(bookingRequestReactionReminder.name, job.id).catch(() => undefined)));
}

/**
 * Schedule (or replace) the 48h customer WhatsApp reaction reminder from `from`.
 * Skips when the due time is already in the past.
 */
export async function bookingRequestReactionReminderSchedule(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; from?: Date },
): Promise<void> {
    await bookingRequestReactionReminderCancel(serverRuntime, args.bookingRequestId);

    const from = args.from ?? new Date();
    const startAfter = new Date(from.getTime() + REACTION_REMINDER_MS);
    if (startAfter.getTime() <= Date.now()) {
        return;
    }

    await serverRuntime.jobs.enqueue(bookingRequestReactionReminder, { bookingRequestId: args.bookingRequestId }, { startAfter });
}
