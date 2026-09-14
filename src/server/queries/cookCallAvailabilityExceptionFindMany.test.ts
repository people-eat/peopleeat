import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cookCallAvailabilityExceptions, cooks } from '../db/schema';
import type { GqlSCook } from '../graphql/generated';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cookCallAvailabilityExceptionFindMany } from './cookCallAvailabilityExceptionFindMany';

function cookParent(cookId: string): GqlSCook {
    return { cookId } as unknown as GqlSCook;
}

async function setupCook() {
    const setup = await commandSetup.withUser({ firstName: 'chef', lastName: 'User' });
    await testDb.insert(cooks).values({ cookId: setup.user.userId });
    return setup;
}

describe('cookCallAvailabilityExceptionFindMany', () => {
    it('returns only exceptions within the [from, to) date range, ordered by date', async () => {
        // Arrange
        const { serverRuntime, requestingSession, user } = await setupCook();
        const before = idCreate();
        const within1 = idCreate();
        const within2 = idCreate();
        const onBoundary = idCreate();
        const after = idCreate();
        await testDb.insert(cookCallAvailabilityExceptions).values([
            { cookCallAvailabilityExceptionId: before, cookId: user.userId, date: '2030-05-31', type: 'BLOCK' },
            {
                cookCallAvailabilityExceptionId: within2,
                cookId: user.userId,
                date: '2030-06-10',
                type: 'OPEN',
                startMinuteOfDay: 600,
                endMinuteOfDay: 720,
            },
            { cookCallAvailabilityExceptionId: within1, cookId: user.userId, date: '2030-06-05', type: 'BLOCK' },
            // `to` is exclusive, so an exception dated exactly on `to` is out of range.
            { cookCallAvailabilityExceptionId: onBoundary, cookId: user.userId, date: '2030-07-01', type: 'BLOCK' },
            { cookCallAvailabilityExceptionId: after, cookId: user.userId, date: '2030-07-15', type: 'BLOCK' },
        ]);

        // Act
        const rows = await cookCallAvailabilityExceptionFindMany(
            cookParent(user.userId),
            { from: '2030-06-01', to: '2030-07-01' },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.cookCallAvailabilityExceptionId)).toEqual([within1, within2]);
    });
});
