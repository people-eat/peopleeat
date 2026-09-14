import type { JobWithMetadata } from 'pg-boss';

import type { ServerRuntime } from '../domain/ServerRuntime';
import { cookBiographySummaryGenerate } from '../jobs/handlers/cookBiographySummaryGenerate';

type SummaryJobData = { cookId: string };

function isPendingSummaryJob(job: JobWithMetadata<SummaryJobData>): boolean {
    // pg-boss `queued: true` is `state < active` (created|retry only). Include `active`
    // so the GraphQL generating flag stays true while the LLM runs.
    return job.state === 'created' || job.state === 'retry' || job.state === 'active';
}

async function pendingSummaryJobs(serverRuntime: ServerRuntime, cookId: string): Promise<JobWithMetadata<SummaryJobData>[]> {
    const rows = await serverRuntime.jobs.findByData(cookBiographySummaryGenerate, { cookId }, { queued: false });
    return rows.filter(isPendingSummaryJob);
}

export async function cookBiographySummaryGenerateCancel(serverRuntime: ServerRuntime, cookId: string): Promise<void> {
    const pending = await pendingSummaryJobs(serverRuntime, cookId);
    await Promise.all(
        pending.map(async (job) => {
            try {
                await serverRuntime.jobs.cancel(cookBiographySummaryGenerate.name, job.id);
            } catch {
                // Missing / already-finished ids are fine.
            }
        }),
    );
}

/** Cancel any pending summary job for this cook, then enqueue a fresh one. */
export async function cookBiographySummaryGenerateSchedule(serverRuntime: ServerRuntime, cookId: string): Promise<void> {
    await cookBiographySummaryGenerateCancel(serverRuntime, cookId);
    // No custom job id: completed rows keep their uuid and `ON CONFLICT DO NOTHING`
    // would silently skip a re-save with a deterministic id. Match pending work via
    // payload `{ cookId }` instead (see `cookBiographySummaryGenerating`).
    await serverRuntime.jobs.enqueue(cookBiographySummaryGenerate, { cookId });
}

export async function cookBiographySummaryGenerating(serverRuntime: ServerRuntime, cookId: string): Promise<boolean> {
    const pending = await pendingSummaryJobs(serverRuntime, cookId);
    return pending.length > 0;
}
