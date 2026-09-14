import { eq } from 'drizzle-orm';

import { bookingRequestOffers } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestOfferTestimonialReminder } from '../jobs/handlers/bookingRequestOfferTestimonialReminder';
import { dayAfterEventAtHourBerlin } from './dayAfterEventAtHourBerlin';

type TestimonialReminderKind = 'MEMORY_NUDGE' | 'REMINDER_MORNING' | 'REMINDER_EVENING';

/**
 * Cancels any previously scheduled testimonial jobs for this offer (stored job
 * ids on `BookingRequestOffers.testimonial*JobId`), then nulls the columns.
 * Safe to call for an offer with no scheduled jobs.
 */
export async function cancelTestimonialReminderJobs(serverRuntime: ServerRuntime, bookingRequestOfferId: string): Promise<void> {
    const [row] = await serverRuntime.db
        .select({
            testimonialMemoryNudgeJobId: bookingRequestOffers.testimonialMemoryNudgeJobId,
            testimonialReminderMorningJobId: bookingRequestOffers.testimonialReminderMorningJobId,
            testimonialReminderEveningJobId: bookingRequestOffers.testimonialReminderEveningJobId,
        })
        .from(bookingRequestOffers)
        .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
        .limit(1);

    const jobIds = [row?.testimonialMemoryNudgeJobId, row?.testimonialReminderMorningJobId, row?.testimonialReminderEveningJobId].filter(
        (jobId): jobId is string => jobId != null,
    );

    if (jobIds.length === 0) return;

    await Promise.all(
        jobIds.map((jobId) =>
            serverRuntime.jobs.cancel(bookingRequestOfferTestimonialReminder.name, jobId).catch((error) => {
                serverRuntime.log.error(error, null);
            }),
        ),
    );

    await serverRuntime.db
        .update(bookingRequestOffers)
        .set({
            testimonialMemoryNudgeJobId: null,
            testimonialReminderMorningJobId: null,
            testimonialReminderEveningJobId: null,
        })
        .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
}

/**
 * Schedule mid-event memory nudge + day-after morning/evening review reminders.
 * Cancels any previously scheduled testimonial jobs for the same offer first
 * (idempotent — safe to call again after a payment retry or event dateTime
 * change). Due dates already in the past are skipped.
 */
export async function scheduleTestimonialReminderJobs(
    serverRuntime: ServerRuntime,
    {
        bookingRequestOfferId,
        eventDate,
    }: {
        bookingRequestOfferId: string;
        eventDate: Date;
    },
): Promise<void> {
    await cancelTestimonialReminderJobs(serverRuntime, bookingRequestOfferId);

    const now = Date.now();
    const memoryNudgeDue = new Date(eventDate.getTime() + 60 * 60 * 1000);
    const morningDue = dayAfterEventAtHourBerlin(eventDate, 9);
    const eveningDue = dayAfterEventAtHourBerlin(eventDate, 19);

    const tasks: {
        kind: TestimonialReminderKind;
        dueDate: Date;
        column: 'testimonialMemoryNudgeJobId' | 'testimonialReminderMorningJobId' | 'testimonialReminderEveningJobId';
    }[] = [
        { kind: 'MEMORY_NUDGE', dueDate: memoryNudgeDue, column: 'testimonialMemoryNudgeJobId' },
        { kind: 'REMINDER_MORNING', dueDate: morningDue, column: 'testimonialReminderMorningJobId' },
        { kind: 'REMINDER_EVENING', dueDate: eveningDue, column: 'testimonialReminderEveningJobId' },
    ];

    const jobIdPatch: Partial<Record<(typeof tasks)[number]['column'], string>> = {};

    await Promise.all(
        tasks
            .filter(({ dueDate }) => dueDate.getTime() > now)
            .map(async ({ kind, dueDate, column }) => {
                const jobId = await serverRuntime.jobs.enqueue(
                    bookingRequestOfferTestimonialReminder,
                    { bookingRequestOfferId, kind },
                    { startAfter: dueDate },
                );
                if (jobId) jobIdPatch[column] = jobId;
            }),
    );

    if (Object.keys(jobIdPatch).length > 0) {
        await serverRuntime.db
            .update(bookingRequestOffers)
            .set(jobIdPatch)
            .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));
    }
}
