import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationQueuedJobCancelArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { jobDefinitions } from '../jobs/jobDefinitions';
import type { QueuedJobDefinition } from '../jobs/types';

/**
 * Admin cancel of a pending pg-boss queued job. Restricts `name` to known
 * queued definitions so clients cannot target arbitrary queues.
 */
export async function adminQueuedJobCancel(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationQueuedJobCancelArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const jobId = args.jobId.trim();
    const name = args.name.trim();
    if (jobId.length === 0) {
        throw new Error('adminQueuedJobCancel: jobId must not be empty');
    }
    if (name.length === 0) {
        throw new Error('adminQueuedJobCancel: name must not be empty');
    }

    const definition = jobDefinitions.find((entry): entry is QueuedJobDefinition => entry.kind === 'queued' && entry.name === name);
    if (!definition) {
        throw new Error('adminQueuedJobCancel: unknown job queue');
    }

    try {
        const pending = await serverRuntime.jobs.findById(definition, jobId);
        if (pending.length === 0) {
            throw new Error('adminQueuedJobCancel: job not found or already finished');
        }

        await serverRuntime.jobs.cancel(name, jobId);
        await serverRuntime.publish.adminUpdates();

        return { success: true, referenceId: jobId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
