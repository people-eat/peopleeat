import type { ServerRuntime } from '../domain/ServerRuntime';
import { userAccountDeletionApply } from '../jobs/handlers/userAccountDeletionApply';

/** Cancel any pending account-deletion job for this user. */
export async function userAccountDeletionJobCancel(serverRuntime: ServerRuntime, userId: string): Promise<void> {
    const jobs = await serverRuntime.jobs.findByData(userAccountDeletionApply, { userId });
    await Promise.all(jobs.map((job) => serverRuntime.jobs.cancel(userAccountDeletionApply.name, job.id).catch(() => undefined)));
}
