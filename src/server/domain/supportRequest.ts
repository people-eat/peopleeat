/**
 * Support-request domain vocabulary — status enum and JSONB shapes for
 * `SupportRequests`. See `docs/features/support-requests.md`.
 */

const supportRequestStatuses = ['OPEN', 'RESOLVED'] as const;
export type SupportRequestStatus = (typeof supportRequestStatuses)[number];

/** Slack ops thread root — same shape as `BookingRequestReferences`. */
export type SupportRequestReferences = {
    slackTs?: string;
    slackChannelId?: string;
};
