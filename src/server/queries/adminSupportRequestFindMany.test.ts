import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { supportRequests } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminSupportRequestFindMany } from './adminSupportRequestFindMany';

describe('adminSupportRequestFindMany', () => {
    it('filters by supportRequestIds', async () => {
        // Arrange
        const { requestingSession, serverRuntime, user } = await commandSetup.withUser({
            firstName: 'Ada',
            lastName: 'Support',
        });
        const token = `sr-ids-${idCreate().slice(0, 8)}`;
        const matchId = idCreate();
        const otherId = idCreate();
        await testDb.insert(supportRequests).values({
            supportRequestId: matchId,
            userId: user.userId,
            subject: `${token}-match`,
        });
        await testDb.insert(supportRequests).values({
            supportRequestId: otherId,
            userId: user.userId,
            subject: `${token}-other`,
        });

        // Act
        const byId = await adminSupportRequestFindMany(
            { criterion: { skip: 0, take: 100, supportRequestIds: [matchId] } },
            requestingSession,
            serverRuntime,
        );
        const unknown = await adminSupportRequestFindMany(
            { criterion: { skip: 0, take: 100, supportRequestIds: [idCreate()] } },
            requestingSession,
            serverRuntime,
        );
        const emptyIds = await adminSupportRequestFindMany(
            { criterion: { skip: 0, take: 100, supportRequestIds: [], searchText: token } },
            requestingSession,
            serverRuntime,
        );
        const andSearch = await adminSupportRequestFindMany(
            {
                criterion: {
                    skip: 0,
                    take: 100,
                    supportRequestIds: [matchId, otherId],
                    searchText: `${token}-match`,
                },
            },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(byId.map((row) => row.supportRequestId)).toEqual([matchId]);
        expect(unknown).toEqual([]);
        expect(emptyIds.map((row) => row.supportRequestId).sort()).toEqual([matchId, otherId].sort());
        expect(andSearch.map((row) => row.supportRequestId)).toEqual([matchId]);
    });
});
