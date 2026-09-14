import type { CookCallAvailabilityException } from '../db/schema';
import type { GqlSCookCallAvailabilityException } from '../graphql/generated';

export function toGqlCookCallAvailabilityException(row: CookCallAvailabilityException): GqlSCookCallAvailabilityException {
    return {
        cookCallAvailabilityExceptionId: row.cookCallAvailabilityExceptionId,
        date: row.date,
        type: row.type,
        startMinuteOfDay: row.startMinuteOfDay ?? null,
        endMinuteOfDay: row.endMinuteOfDay ?? null,
    };
}
