import { eq } from 'drizzle-orm';

import { supportRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { supportRequestCustomerReplyNotify } from '../jobs/handlers/supportRequestCustomerReplyNotify';

const DEBOUNCE_MS = 60_000;

async function cancelStoredJob(serverRuntime: ServerRuntime, jobId: string | null | undefined): Promise<void> {
    if (!jobId) return;
    try {
        await serverRuntime.jobs.cancel(supportRequestCustomerReplyNotify.name, jobId);
    } catch (error) {
        serverRuntime.log.error(error, null);
    }
}

/**
 * Cancel any pending customer reply-notify job for this support request
 * (unread reset / resolve). Failures are logged and do not undo the write.
 */
export async function supportRequestCustomerReplyNotifyCancel(
    serverRuntime: ServerRuntime,
    args: { supportRequestId: string; customerReplyNotifyJobId?: string | null },
): Promise<void> {
    let jobId = args.customerReplyNotifyJobId;
    if (jobId === undefined) {
        const [row] = await serverRuntime.db
            .select({ customerReplyNotifyJobId: supportRequests.customerReplyNotifyJobId })
            .from(supportRequests)
            .where(eq(supportRequests.supportRequestId, args.supportRequestId))
            .limit(1);
        jobId = row?.customerReplyNotifyJobId ?? null;
    }

    await cancelStoredJob(serverRuntime, jobId);

    await serverRuntime.db
        .update(supportRequests)
        .set({ customerReplyNotifyJobId: null })
        .where(eq(supportRequests.supportRequestId, args.supportRequestId));
}

/**
 * Schedule (or re-schedule) the 1-minute debounced customer reply email.
 * Cancels any prior pending job for the same support request so rapid admin
 * replies coalesce into one mail.
 */
export async function supportRequestCustomerReplyNotifySchedule(
    serverRuntime: ServerRuntime,
    args: { supportRequestId: string; customerReplyNotifyJobId?: string | null },
): Promise<void> {
    await supportRequestCustomerReplyNotifyCancel(serverRuntime, args);

    const jobId = await serverRuntime.jobs.enqueue(
        supportRequestCustomerReplyNotify,
        { supportRequestId: args.supportRequestId },
        { startAfter: new Date(Date.now() + DEBOUNCE_MS) },
    );

    if (!jobId) {
        return;
    }

    await serverRuntime.db
        .update(supportRequests)
        .set({ customerReplyNotifyJobId: jobId })
        .where(eq(supportRequests.supportRequestId, args.supportRequestId));
}
