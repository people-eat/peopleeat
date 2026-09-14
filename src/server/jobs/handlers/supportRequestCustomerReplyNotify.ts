import { eq } from 'drizzle-orm';

import { supportRequests } from '../../db/schema';
import { adminSupportRequestMessageCreateEmailSend } from '../../utils/supportRequestLifecycleEmails';
import type { QueuedJobDefinition } from '../types';

interface SupportRequestCustomerReplyNotifyData {
    supportRequestId: string;
}

/**
 * Debounced customer email after an admin support reply. Skips when the
 * customer already cleared unread (opened the chat). See
 * `docs/features/support-requests.md`.
 */
export const supportRequestCustomerReplyNotify: QueuedJobDefinition<SupportRequestCustomerReplyNotifyData> = {
    kind: 'queued',
    name: 'support-request-customer-reply-notify',
    handler: async ({ data, serverRuntime }) => {
        const [row] = await serverRuntime.db
            .select({
                supportRequestId: supportRequests.supportRequestId,
                userUnreadNotificationCount: supportRequests.userUnreadNotificationCount,
            })
            .from(supportRequests)
            .where(eq(supportRequests.supportRequestId, data.supportRequestId))
            .limit(1);

        // Unread reset cancels the job; this check covers races where the job
        // already started before cancel landed.
        if (!row || row.userUnreadNotificationCount <= 0) {
            return;
        }

        await adminSupportRequestMessageCreateEmailSend(serverRuntime, { supportRequestId: data.supportRequestId });
    },
    options: {
        retryLimit: 3,
        retryDelay: 30,
        expireInSeconds: 300,
    },
};
