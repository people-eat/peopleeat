import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestAdjustedMessageGenerateCancel } from './bookingRequestAdjustedMessageGenerateSchedule';
import { bookingRequestExpireNotifyCancel } from './bookingRequestExpireNotifySchedule';
import { bookingRequestNoOffersNotifyCancel } from './bookingRequestNoOffersNotifySchedule';
import { bookingRequestReactionReminderCancel } from './bookingRequestReactionReminderSchedule';

/**
 * Cancels request-scoped pending jobs (expire notify + no-offers Slack +
 * reaction reminder + adjusted-message AI) for a booking request. Used on cancel
 * and when the first offer arrives (no-offers only — callers cancel that queue
 * separately when needed).
 */
export async function bookingRequestQueuedJobsCancel(serverRuntime: ServerRuntime, bookingRequestId: string): Promise<void> {
    await Promise.all([
        bookingRequestExpireNotifyCancel(serverRuntime, bookingRequestId),
        bookingRequestNoOffersNotifyCancel(serverRuntime, bookingRequestId),
        bookingRequestReactionReminderCancel(serverRuntime, bookingRequestId),
        bookingRequestAdjustedMessageGenerateCancel(serverRuntime, bookingRequestId),
    ]);
}
