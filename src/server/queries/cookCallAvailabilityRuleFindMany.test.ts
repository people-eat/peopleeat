import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cookCallAvailabilityRules, cooks } from '../db/schema';
import type { GqlSCook } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookCallAvailabilityRuleFindMany } from './cookCallAvailabilityRuleFindMany';

function cookParent(cookId: string): GqlSCook {
    return { cookId } as unknown as GqlSCook;
}

async function setupCook() {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

describe('cookCallAvailabilityRuleFindMany', () => {
    it('returns the rules for the cook ordered by dayOfWeek then startMinuteOfDay', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const tuesdayLate = idCreate();
        const mondayEarly = idCreate();
        const mondayLate = idCreate();
        await testDb.insert(cookCallAvailabilityRules).values([
            { cookCallAvailabilityRuleId: tuesdayLate, cookId: user.userId, dayOfWeek: 2, startMinuteOfDay: 600, endMinuteOfDay: 720 },
            { cookCallAvailabilityRuleId: mondayLate, cookId: user.userId, dayOfWeek: 1, startMinuteOfDay: 900, endMinuteOfDay: 960 },
            { cookCallAvailabilityRuleId: mondayEarly, cookId: user.userId, dayOfWeek: 1, startMinuteOfDay: 480, endMinuteOfDay: 540 },
        ]);

        // Act
        const rows = await cookCallAvailabilityRuleFindMany(cookParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(rows.map((row) => row.cookCallAvailabilityRuleId)).toEqual([mondayEarly, mondayLate, tuesdayLate]);
    });

    it("excludes another cook's rules", async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const other = await setupCook();
        const ownRuleId = idCreate();
        await testDb.insert(cookCallAvailabilityRules).values([
            { cookCallAvailabilityRuleId: ownRuleId, cookId: user.userId, dayOfWeek: 3, startMinuteOfDay: 600, endMinuteOfDay: 660 },
            {
                cookCallAvailabilityRuleId: idCreate(),
                cookId: other.user.userId,
                dayOfWeek: 3,
                startMinuteOfDay: 600,
                endMinuteOfDay: 660,
            },
        ]);

        // Act
        const rows = await cookCallAvailabilityRuleFindMany(cookParent(user.userId), requestingSession, serverRuntime);

        // Assert
        expect(rows.map((row) => row.cookCallAvailabilityRuleId)).toEqual([ownRuleId]);
    });
});
