import { eq } from 'drizzle-orm';

import { COOK_CALL_MAX_WEEKLY_RULES, COOK_CALL_MINUTES_PER_DAY } from '../../shared/cookCallAvailability';
import { idCreate } from '../../shared/idCreate';
import type { CookCallAvailabilityRuleCreate } from '../db/schema';
import { cookCallAvailabilityRules } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationCallAvailabilityRuleCreateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function cookCallAvailabilityRuleCreate(
    { cookId }: GqlSCookMutation,
    { rule }: GqlSCookMutationCallAvailabilityRuleCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    const { dayOfWeek, startMinuteOfDay, endMinuteOfDay } = rule;

    if (dayOfWeek < 0 || dayOfWeek > 6) {
        throw new Error('cookCallAvailabilityRuleCreate: dayOfWeek is out of range');
    }
    if (startMinuteOfDay < 0 || endMinuteOfDay > COOK_CALL_MINUTES_PER_DAY) {
        throw new Error('cookCallAvailabilityRuleCreate: minutes are out of range');
    }
    if (startMinuteOfDay >= endMinuteOfDay) {
        throw new Error('cookCallAvailabilityRuleCreate: start must be before end');
    }

    const existing = await serverRuntime.db
        .select({ cookCallAvailabilityRuleId: cookCallAvailabilityRules.cookCallAvailabilityRuleId })
        .from(cookCallAvailabilityRules)
        .where(eq(cookCallAvailabilityRules.cookId, cookId));

    if (existing.length >= COOK_CALL_MAX_WEEKLY_RULES) {
        throw new Error('cookCallAvailabilityRuleCreate: maximum weekly rules reached');
    }

    const cookCallAvailabilityRuleId = idCreate();
    const values: CookCallAvailabilityRuleCreate = {
        cookCallAvailabilityRuleId,
        cookId,
        dayOfWeek,
        startMinuteOfDay,
        endMinuteOfDay,
    };

    try {
        await serverRuntime.db.insert(cookCallAvailabilityRules).values(values);
        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: cookCallAvailabilityRuleId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
