import type { JobWithMetadata } from 'pg-boss';

import type { ServerRuntime } from '../domain/ServerRuntime';
import {
    bookingRequestAdjustedMessageGenerate,
    type BookingRequestAdjustedMessageGenerateData,
} from '../jobs/handlers/bookingRequestAdjustedMessageGenerate';
import { featureToggleIsEnabled } from './featureToggleIsEnabled';

function isPendingJob(job: JobWithMetadata<BookingRequestAdjustedMessageGenerateData>): boolean {
    return job.state === 'created' || job.state === 'retry' || job.state === 'active';
}

async function pendingJobs(
    serverRuntime: ServerRuntime,
    bookingRequestId: string,
): Promise<JobWithMetadata<BookingRequestAdjustedMessageGenerateData>[]> {
    const rows = await serverRuntime.jobs.findByData(bookingRequestAdjustedMessageGenerate, { bookingRequestId }, { queued: false });
    return rows.filter(isPendingJob);
}

export async function bookingRequestAdjustedMessageGenerateCancel(
    serverRuntime: ServerRuntime,
    bookingRequestId: string,
): Promise<void> {
    const pending = await pendingJobs(serverRuntime, bookingRequestId);
    await Promise.all(
        pending.map(async (job) => {
            try {
                await serverRuntime.jobs.cancel(bookingRequestAdjustedMessageGenerate.name, job.id);
            } catch {
                // Missing / already-finished ids are fine.
            }
        }),
    );
}

/** Cancel any pending adjusted-message job for this request, then enqueue a fresh one. */
export async function bookingRequestAdjustedMessageGenerateSchedule(
    serverRuntime: ServerRuntime,
    bookingRequestId: string,
): Promise<void> {
    await bookingRequestAdjustedMessageGenerateCancel(serverRuntime, bookingRequestId);
    await serverRuntime.jobs.enqueue(bookingRequestAdjustedMessageGenerate, { bookingRequestId });
}

/**
 * Enqueue when `AI_BOOKING_REQUEST_MESSAGE` is on for the customer and the
 * original message is non-empty. No-op otherwise.
 */
export async function bookingRequestAdjustedMessageGenerateScheduleIfEnabled(
    serverRuntime: ServerRuntime,
    input: { bookingRequestId: string; userId: string; originalMessage: string },
): Promise<void> {
    if (input.originalMessage.trim().length === 0) {
        return;
    }
    const enabled = await featureToggleIsEnabled('AI_BOOKING_REQUEST_MESSAGE', serverRuntime, input.userId);
    if (!enabled) {
        return;
    }
    await bookingRequestAdjustedMessageGenerateSchedule(serverRuntime, input.bookingRequestId);
}
