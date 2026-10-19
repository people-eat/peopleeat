import { and, eq, isNull } from 'drizzle-orm';

import { outboundEmails } from '../db/schema';
import type { OutboundEmailCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

export type OutboundEmailProviderEvent = {
    type: string;
    emailId: string;
    createdAt: Date;
    failureReason?: string | null;
};

type LifecycleColumn =
    'sentAt' | 'deliveredAt' | 'deliveryDelayedAt' | 'openedAt' | 'clickedAt' | 'bouncedAt' | 'complainedAt' | 'failedAt';

/**
 * Applies a Resend lifecycle webhook to the matching `OutboundEmails` row.
 * Timestamps are first-write-wins (`IS NULL` guards) so at-least-once delivery
 * and out-of-order events stay idempotent. Unknown `emailId` values are ignored
 * (caller still returns HTTP 200) so Resend does not retry orphans forever.
 */
export async function outboundEmailProviderEventApply(
    event: OutboundEmailProviderEvent,
    serverRuntime: ServerRuntime,
): Promise<{ applied: boolean }> {
    const column = lifecycleColumnForEventType(event.type);
    if (!column) {
        serverRuntime.log.warn(`outboundEmailProviderEventApply: unknown event type=${event.type} emailId=${event.emailId}`);
        return { applied: false };
    }

    const [existing] = await serverRuntime.db
        .select({ outboundEmailId: outboundEmails.outboundEmailId })
        .from(outboundEmails)
        .where(eq(outboundEmails.providerMessageId, event.emailId))
        .limit(1);

    if (!existing) {
        // Orphan / other-app Resend traffic — expected; keep silent so at-least-once retries stay quiet.
        return { applied: false };
    }

    const setValues: Partial<OutboundEmailCreate> = {};
    if (column === 'failedAt') {
        setValues.failedAt = event.createdAt;
        if (event.failureReason) {
            setValues.failureReason = event.failureReason.slice(0, 500);
        }
    } else {
        setValues[column] = event.createdAt;
    }

    const nullGuard = nullGuardForColumn(column);

    const updated = await serverRuntime.db
        .update(outboundEmails)
        .set(setValues)
        .where(and(eq(outboundEmails.outboundEmailId, existing.outboundEmailId), nullGuard))
        .returning({ outboundEmailId: outboundEmails.outboundEmailId });

    if (updated.length > 0) {
        await serverRuntime.publish.adminUpdates();
        return { applied: true };
    }

    return { applied: false };
}

function nullGuardForColumn(column: LifecycleColumn) {
    switch (column) {
        case 'sentAt':
            return isNull(outboundEmails.sentAt);
        case 'deliveredAt':
            return isNull(outboundEmails.deliveredAt);
        case 'deliveryDelayedAt':
            return isNull(outboundEmails.deliveryDelayedAt);
        case 'openedAt':
            return isNull(outboundEmails.openedAt);
        case 'clickedAt':
            return isNull(outboundEmails.clickedAt);
        case 'bouncedAt':
            return isNull(outboundEmails.bouncedAt);
        case 'complainedAt':
            return isNull(outboundEmails.complainedAt);
        case 'failedAt':
            return isNull(outboundEmails.failedAt);
    }
}

function lifecycleColumnForEventType(type: string): LifecycleColumn | null {
    switch (type) {
        case 'email.sent':
            return 'sentAt';
        case 'email.delivered':
            return 'deliveredAt';
        case 'email.delivery_delayed':
            return 'deliveryDelayedAt';
        case 'email.opened':
            return 'openedAt';
        case 'email.clicked':
            return 'clickedAt';
        case 'email.bounced':
            return 'bouncedAt';
        case 'email.complained':
            return 'complainedAt';
        case 'email.failed':
            return 'failedAt';
        default:
            return null;
    }
}
