import type { JobWithMetadata } from 'pg-boss';

import type { GqlSAdminQueuedJob, GqlSAdminQueuedJobState } from '../graphql/generated';

function toAdminQueuedJobState(state: JobWithMetadata['state']): GqlSAdminQueuedJobState | null {
    switch (state) {
        case 'created':
            return 'CREATED';
        case 'retry':
            return 'RETRY';
        case 'active':
            return 'ACTIVE';
        default:
            return null;
    }
}

function stringId(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function relatedIdsFromData(
    data: unknown,
): Pick<
    GqlSAdminQueuedJob,
    'bookingRequestId' | 'bookingRequestOfferId' | 'giftCardId' | 'supportRequestId' | 'userId' | 'cookId' | 'chatId'
> {
    if (!data || typeof data !== 'object') {
        return {
            bookingRequestId: null,
            bookingRequestOfferId: null,
            giftCardId: null,
            supportRequestId: null,
            userId: null,
            cookId: null,
            chatId: null,
        };
    }
    const record = data as Record<string, unknown>;
    return {
        bookingRequestId: stringId(record.bookingRequestId),
        bookingRequestOfferId: stringId(record.bookingRequestOfferId),
        giftCardId: stringId(record.giftCardId),
        supportRequestId: stringId(record.supportRequestId),
        userId: stringId(record.userId),
        cookId: stringId(record.cookId),
        chatId: stringId(record.chatId),
    };
}

export function toGqlAdminQueuedJob(job: JobWithMetadata<unknown>): GqlSAdminQueuedJob | null {
    const state = toAdminQueuedJobState(job.state);
    if (!state) return null;

    return {
        jobId: job.id,
        name: job.name,
        state,
        startAfter: job.startAfter,
        createdOn: job.createdOn,
        data: job.data,
        ...relatedIdsFromData(job.data),
    };
}
