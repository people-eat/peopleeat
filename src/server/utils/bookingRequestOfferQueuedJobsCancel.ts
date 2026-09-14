import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestOfferPullPayment } from '../jobs/handlers/bookingRequestOfferPullPayment';
import { bookingRequestOfferPullPaymentAnnouncement } from '../jobs/handlers/bookingRequestOfferPullPaymentAnnouncement';
import { bookingRequestOfferTestimonialReminder } from '../jobs/handlers/bookingRequestOfferTestimonialReminder';
import { bookingRequestOfferEventTomorrowNotifyCancel } from './bookingRequestOfferEventTomorrowNotifySchedule';
import { cancelTestimonialReminderJobs } from './scheduleTestimonialReminderJobs';

/**
 * Cancels pull-payment / announcement / event-tomorrow jobs found by offer id
 * payload, plus testimonial reminder jobs stored on the offer row.
 */
export async function bookingRequestOfferQueuedJobsCancel(serverRuntime: ServerRuntime, bookingRequestOfferId: string): Promise<void> {
    const offerData = { bookingRequestOfferId };
    const [pullJobs, announcementJobs] = await Promise.all([
        serverRuntime.jobs.findByData(bookingRequestOfferPullPayment, offerData),
        serverRuntime.jobs.findByData(bookingRequestOfferPullPaymentAnnouncement, offerData),
    ]);

    await Promise.all([
        ...pullJobs.map((job) => serverRuntime.jobs.cancel(bookingRequestOfferPullPayment.name, job.id).catch(() => undefined)),
        ...announcementJobs.map((job) =>
            serverRuntime.jobs.cancel(bookingRequestOfferPullPaymentAnnouncement.name, job.id).catch(() => undefined),
        ),
        bookingRequestOfferEventTomorrowNotifyCancel(serverRuntime, bookingRequestOfferId),
        cancelTestimonialReminderJobs(serverRuntime, bookingRequestOfferId),
        // Also cancel any testimonial jobs found by payload (ids may be missing on row).
        serverRuntime.jobs
            .findByData(bookingRequestOfferTestimonialReminder, offerData)
            .then((jobs) =>
                Promise.all(
                    jobs.map((job) =>
                        serverRuntime.jobs.cancel(bookingRequestOfferTestimonialReminder.name, job.id).catch(() => undefined),
                    ),
                ),
            ),
    ]);
}
