import type { CookCallAvailabilityRule } from '../db/schema';
import type { GqlSCookCallAvailabilityRule } from '../graphql/generated';

export function toGqlCookCallAvailabilityRule(row: CookCallAvailabilityRule): GqlSCookCallAvailabilityRule {
    return {
        cookCallAvailabilityRuleId: row.cookCallAvailabilityRuleId,
        dayOfWeek: row.dayOfWeek,
        startMinuteOfDay: row.startMinuteOfDay,
        endMinuteOfDay: row.endMinuteOfDay,
    };
}
