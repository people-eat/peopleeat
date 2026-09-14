import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestOfferCallSlotsComplete } from '../jobs/handlers/bookingRequestOfferCallSlotsComplete';

const COMPLETE_GRACE_MS = 15 * 60_000;

/**
 * Cancels any pending call-slot complete / expire job for this booking.
 */
export async function bookingRequestOfferCallSlotsCompleteCancel(
    serverRuntime: ServerRuntime,
    cookCallSlotBookingId: string,
): Promise<void> {
    const jobs = await serverRuntime.jobs.findByData(bookingRequestOfferCallSlotsComplete, { cookCallSlotBookingId });
    await Promise.all(
        jobs.map((job) => serverRuntime.jobs.cancel(bookingRequestOfferCallSlotsComplete.name, job.id).catch(() => undefined)),
    );
}

/**
 * Schedule (or re-schedule) slot completion:
 * - PENDING → run at `endAt` (expire unconfirmed)
 * - CONFIRMED → run at `endAt + 15m` (mark completed)
 *
 * Cancels any prior pending job first. Skips when the due time is already past
 * (the handler can still be invoked manually / via a late reschedule).
 */
export async function bookingRequestOfferCallSlotsCompleteSchedule(
    serverRuntime: ServerRuntime,
    args: {
        cookCallSlotBookingId: string;
        endAt: Date;
        status: 'PENDING' | 'CONFIRMED';
    },
): Promise<void> {
    await bookingRequestOfferCallSlotsCompleteCancel(serverRuntime, args.cookCallSlotBookingId);

    const startAfter = args.status === 'CONFIRMED' ? new Date(args.endAt.getTime() + COMPLETE_GRACE_MS) : new Date(args.endAt.getTime());

    if (startAfter.getTime() <= Date.now()) {
        return;
    }

    await serverRuntime.jobs.enqueue(
        bookingRequestOfferCallSlotsComplete,
        { cookCallSlotBookingId: args.cookCallSlotBookingId },
        { startAfter },
    );
}
