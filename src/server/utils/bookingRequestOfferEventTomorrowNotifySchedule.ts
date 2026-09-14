import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestOfferEventTomorrowNotify } from '../jobs/handlers/bookingRequestOfferEventTomorrowNotify';
import { dayBeforeEventAtHourBerlin } from './dayAfterEventAtHourBerlin';

/** 08:00 Europe/Berlin on the calendar day before the event. */
const EVENT_TOMORROW_NOTIFY_HOUR_BERLIN = 8;

/**
 * Cancels any pending event-tomorrow Slack job for this offer.
 */
export async function bookingRequestOfferEventTomorrowNotifyCancel(
    serverRuntime: ServerRuntime,
    bookingRequestOfferId: string,
): Promise<void> {
    const jobs = await serverRuntime.jobs.findByData(bookingRequestOfferEventTomorrowNotify, { bookingRequestOfferId });
    await Promise.all(
        jobs.map((job) => serverRuntime.jobs.cancel(bookingRequestOfferEventTomorrowNotify.name, job.id).catch(() => undefined)),
    );
}

/**
 * Schedule (or re-schedule) the morning-before-event Slack alert. Cancels any
 * prior pending job first. Skips when the due time is already past.
 */
export async function bookingRequestOfferEventTomorrowNotifySchedule(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; bookingRequestOfferId: string; eventDate: Date },
): Promise<void> {
    await bookingRequestOfferEventTomorrowNotifyCancel(serverRuntime, args.bookingRequestOfferId);

    const startAfter = dayBeforeEventAtHourBerlin(args.eventDate, EVENT_TOMORROW_NOTIFY_HOUR_BERLIN);
    if (startAfter.getTime() <= Date.now()) {
        return;
    }

    await serverRuntime.jobs.enqueue(
        bookingRequestOfferEventTomorrowNotify,
        {
            bookingRequestId: args.bookingRequestId,
            bookingRequestOfferId: args.bookingRequestOfferId,
        },
        { startAfter },
    );
}
