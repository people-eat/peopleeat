import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { COOK_CALL_MAX_WEEKLY_RULES } from '../../shared/cookCallAvailability';
import { cookCallAvailabilityExceptions, cookCallAvailabilityRules, cooks } from '../db/schema';
import { commandSetup, cookMutationParent, testDb } from '../test/commandTestUtils';
import { cookCallAvailabilityExceptionCreate } from './cookCallAvailabilityExceptionCreate';
import { cookCallAvailabilityExceptionDelete } from './cookCallAvailabilityExceptionDelete';
import { cookCallAvailabilityRuleCreate } from './cookCallAvailabilityRuleCreate';
import { cookCallAvailabilityRuleDelete } from './cookCallAvailabilityRuleDelete';

async function setupCook() {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

describe('cookCallAvailabilityRuleCreate', () => {
    it('inserts a weekly rule and publishes userUpdates', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();

        const result = await cookCallAvailabilityRuleCreate(
            cookMutationParent(user.userId),
            { rule: { dayOfWeek: 1, startMinuteOfDay: 600, endMinuteOfDay: 720 } },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        const rows = await testDb
            .select()
            .from(cookCallAvailabilityRules)
            .where(eq(cookCallAvailabilityRules.cookCallAvailabilityRuleId, result.referenceId!));
        expect(rows).toHaveLength(1);
        expect(rows[0]!.dayOfWeek).toBe(1);
        expect(rows[0]!.startMinuteOfDay).toBe(600);
        expect(rows[0]!.endMinuteOfDay).toBe(720);
        expect(serverRuntime.publish.userUpdates).toHaveBeenCalledWith({ userId: user.userId });
    });

    it('rejects invalid dayOfWeek and inverted minutes', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();

        await expect(
            cookCallAvailabilityRuleCreate(
                cookMutationParent(user.userId),
                { rule: { dayOfWeek: 7, startMinuteOfDay: 600, endMinuteOfDay: 720 } },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/dayOfWeek/);

        await expect(
            cookCallAvailabilityRuleCreate(
                cookMutationParent(user.userId),
                { rule: { dayOfWeek: 1, startMinuteOfDay: 720, endMinuteOfDay: 600 } },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/start must be before end/);
    });

    it(`rejects a ${COOK_CALL_MAX_WEEKLY_RULES + 1}th weekly rule`, async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();

        for (let dayOfWeek = 1; dayOfWeek <= COOK_CALL_MAX_WEEKLY_RULES; dayOfWeek++) {
            await cookCallAvailabilityRuleCreate(
                cookMutationParent(user.userId),
                { rule: { dayOfWeek, startMinuteOfDay: 600, endMinuteOfDay: 720 } },
                requestingSession,
                serverRuntime,
            );
        }

        await expect(
            cookCallAvailabilityRuleCreate(
                cookMutationParent(user.userId),
                { rule: { dayOfWeek: 5, startMinuteOfDay: 600, endMinuteOfDay: 720 } },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/maximum weekly rules/);
    });
});

describe('cookCallAvailabilityRuleDelete', () => {
    it('deletes a rule scoped to the cook', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookCallAvailabilityRuleCreate(
            cookMutationParent(user.userId),
            { rule: { dayOfWeek: 2, startMinuteOfDay: 540, endMinuteOfDay: 600 } },
            requestingSession,
            serverRuntime,
        );

        const result = await cookCallAvailabilityRuleDelete(
            cookMutationParent(user.userId),
            { cookCallAvailabilityRuleId: created.referenceId! },
            requestingSession,
            serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: created.referenceId });
        const rows = await testDb
            .select()
            .from(cookCallAvailabilityRules)
            .where(eq(cookCallAvailabilityRules.cookCallAvailabilityRuleId, created.referenceId!));
        expect(rows).toHaveLength(0);
    });
});

describe('cookCallAvailabilityExceptionCreate', () => {
    it('inserts an all-day BLOCK exception', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();

        const result = await cookCallAvailabilityExceptionCreate(
            cookMutationParent(user.userId),
            { exception: { date: '2030-06-15', type: 'BLOCK', startMinuteOfDay: null, endMinuteOfDay: null } },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
        const [row] = await testDb
            .select()
            .from(cookCallAvailabilityExceptions)
            .where(eq(cookCallAvailabilityExceptions.cookCallAvailabilityExceptionId, result.referenceId!));
        expect(row!.type).toBe('BLOCK');
        expect(row!.date).toBe('2030-06-15');
        expect(row!.startMinuteOfDay).toBeNull();
        expect(row!.endMinuteOfDay).toBeNull();
    });

    it('rejects mismatched minute nullability', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();

        await expect(
            cookCallAvailabilityExceptionCreate(
                cookMutationParent(user.userId),
                { exception: { date: '2030-06-15', type: 'OPEN', startMinuteOfDay: 600, endMinuteOfDay: null } },
                requestingSession,
                serverRuntime,
            ),
        ).rejects.toThrow(/both be null or both set/);
    });
});

describe('cookCallAvailabilityExceptionDelete', () => {
    it('deletes an exception scoped to the cook', async () => {
        const { serverRuntime, requestingSession, user } = await setupCook();
        const created = await cookCallAvailabilityExceptionCreate(
            cookMutationParent(user.userId),
            { exception: { date: '2030-07-01', type: 'OPEN', startMinuteOfDay: 600, endMinuteOfDay: 720 } },
            requestingSession,
            serverRuntime,
        );

        const result = await cookCallAvailabilityExceptionDelete(
            cookMutationParent(user.userId),
            { cookCallAvailabilityExceptionId: created.referenceId! },
            requestingSession,
            serverRuntime,
        );

        expect(result).toEqual({ success: true, referenceId: created.referenceId });
        const rows = await testDb
            .select()
            .from(cookCallAvailabilityExceptions)
            .where(eq(cookCallAvailabilityExceptions.cookCallAvailabilityExceptionId, created.referenceId!));
        expect(rows).toHaveLength(0);
    });
});
