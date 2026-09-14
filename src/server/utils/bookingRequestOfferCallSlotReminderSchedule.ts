import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestOfferCallSlotReminder } from '../jobs/handlers/bookingRequestOfferCallSlotReminder';

const REMINDER_LEAD_MS = 60 * 60_000;

/**
 * Enqueues a reminder email ~60 minutes before `startAt`. Skips when the call
 * starts sooner than the lead time. The job handler no-ops if the booking is
 * no longer CONFIRMED.
 */
export async function bookingRequestOfferCallSlotReminderSchedule(
    serverRuntime: ServerRuntime,
    args: { cookCallSlotBookingId: string; startAt: Date },
): Promise<void> {
    const startAfter = new Date(args.startAt.getTime() - REMINDER_LEAD_MS);
    if (startAfter.getTime() <= Date.now()) {
        return;
    }

    await serverRuntime.jobs.enqueue(
        bookingRequestOfferCallSlotReminder,
        { cookCallSlotBookingId: args.cookCallSlotBookingId },
        { startAfter },
    );
}
