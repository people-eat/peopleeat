import { and, eq } from 'drizzle-orm';
import type { JobWithMetadata } from 'pg-boss';

import { bookingRequestCooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { cookBookingRequestMenuEvaluationGenerateJob } from '../jobs/handlers/cookBookingRequestMenuEvaluationGenerate';

type EvaluationJobData = { cookId: string; bookingRequestId: string };

function isPendingEvaluationJob(job: JobWithMetadata<EvaluationJobData>): boolean {
    return job.state === 'created' || job.state === 'retry' || job.state === 'active';
}

async function pendingEvaluationJobs(
    serverRuntime: ServerRuntime,
    cookId: string,
    bookingRequestId: string,
): Promise<JobWithMetadata<EvaluationJobData>[]> {
    const rows = await serverRuntime.jobs.findByData(
        cookBookingRequestMenuEvaluationGenerateJob,
        { cookId, bookingRequestId },
        { queued: false },
    );
    return rows.filter(isPendingEvaluationJob);
}

async function cookBookingRequestMenuEvaluationCancel(
    serverRuntime: ServerRuntime,
    cookId: string,
    bookingRequestId: string,
): Promise<void> {
    const pending = await pendingEvaluationJobs(serverRuntime, cookId, bookingRequestId);
    await Promise.all(
        pending.map(async (job) => {
            try {
                await serverRuntime.jobs.cancel(cookBookingRequestMenuEvaluationGenerateJob.name, job.id);
            } catch {
                // Missing / already-finished ids are fine.
            }
        }),
    );
}

/** Cancel any pending evaluation job, set loading, enqueue a fresh one. */
export async function cookBookingRequestMenuEvaluationSchedule(
    serverRuntime: ServerRuntime,
    cookId: string,
    bookingRequestId: string,
): Promise<void> {
    await cookBookingRequestMenuEvaluationCancel(serverRuntime, cookId, bookingRequestId);

    await serverRuntime.db
        .update(bookingRequestCooks)
        .set({
            menuEvaluationLoading: true,
            menuEvaluation: null,
        })
        .where(and(eq(bookingRequestCooks.cookId, cookId), eq(bookingRequestCooks.bookingRequestId, bookingRequestId)));

    await serverRuntime.jobs.enqueue(cookBookingRequestMenuEvaluationGenerateJob, { cookId, bookingRequestId });
}
