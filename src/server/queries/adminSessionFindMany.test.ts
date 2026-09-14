import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { sessions } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminSessionFindMany } from './adminSessionFindMany';

const allKinds = ['human', 'bot'] as const;

describe('adminSessionFindMany', () => {
    it('returns seeded sessions ordered by createdAt descending', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'session-order-admin', lastName: 'User' });
        const token = `order-${idCreate().slice(0, 8)}`;
        const olderId = idCreate();
        const newerId = idCreate();
        await testDb.insert(sessions).values({
            sessionId: olderId,
            userAgent: `older-${token}`,
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
        });
        await testDb.insert(sessions).values({
            sessionId: newerId,
            userAgent: `newer-${token}`,
            createdAt: new Date('2024-06-01T00:00:00.000Z'),
        });

        // Act
        const rows = await adminSessionFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, kinds: [...allKinds] } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        const olderIdx = rows.findIndex((row) => row.sessionId === olderId);
        const newerIdx = rows.findIndex((row) => row.sessionId === newerId);
        expect(newerIdx).toBeGreaterThanOrEqual(0);
        expect(olderIdx).toBeGreaterThanOrEqual(0);
        expect(newerIdx).toBeLessThan(olderIdx);
    });

    it('filters by searchText against userAgent and landingPath', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'session-search-admin', lastName: 'User' });
        const token = `ua-${idCreate().slice(0, 8)}`;
        const matchAgentId = idCreate();
        const matchPathId = idCreate();
        const missId = idCreate();
        await testDb.insert(sessions).values({
            sessionId: matchAgentId,
            userAgent: `Mozilla ${token}`,
        });
        await testDb.insert(sessions).values({
            sessionId: matchPathId,
            landingPath: `/landing/${token}`,
        });
        await testDb.insert(sessions).values({
            sessionId: missId,
            userAgent: 'no-match-agent',
            landingPath: '/elsewhere',
        });

        // Act
        const rows = await adminSessionFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, kinds: [...allKinds] } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        const ids = new Set(rows.map((row) => row.sessionId));
        expect(ids.has(matchAgentId)).toBe(true);
        expect(ids.has(matchPathId)).toBe(true);
        expect(ids.has(missId)).toBe(false);
    });

    it('paginates with skip and take', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'session-page-admin', lastName: 'User' });
        const token = `page-${idCreate().slice(0, 8)}`;
        const ids = [idCreate(), idCreate(), idCreate()];
        for (const [index, sessionId] of ids.entries()) {
            await testDb.insert(sessions).values({
                sessionId,
                userAgent: `${token}-${index}`,
            });
        }

        // Act
        const page = await adminSessionFindMany(
            { criterion: { skip: 0, take: 2, searchText: token, kinds: [...allKinds] } },
            setup.requestingSession,
            setup.serverRuntime,
        );
        const next = await adminSessionFindMany(
            { criterion: { skip: 2, take: 2, searchText: token, kinds: [...allKinds] } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(page).toHaveLength(2);
        expect(next).toHaveLength(1);
        expect(new Set([...page, ...next].map((row) => row.sessionId)).size).toBe(3);
    });

    it('returns no rows when kinds is empty', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'session-empty-kinds', lastName: 'User' });

        // Act
        const rows = await adminSessionFindMany(
            { criterion: { skip: 0, take: 100, kinds: [] } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(rows).toEqual([]);
    });

    it('filters by AdminSessionKind bot vs human', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'session-kind-admin', lastName: 'User' });
        const token = `kind-${idCreate().slice(0, 8)}`;
        const humanId = idCreate();
        const botId = idCreate();
        await testDb.insert(sessions).values({
            sessionId: humanId,
            userAgent: `${token}-human`,
            isBot: false,
        });
        await testDb.insert(sessions).values({
            sessionId: botId,
            userAgent: `${token}-bot`,
            isBot: true,
        });

        // Act
        const humans = await adminSessionFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, kinds: ['human'] } },
            setup.requestingSession,
            setup.serverRuntime,
        );
        const bots = await adminSessionFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, kinds: ['bot'] } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(humans.map((row) => row.sessionId)).toEqual([humanId]);
        expect(bots.map((row) => row.sessionId)).toEqual([botId]);
    });

    it('filters by userIds', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'session-user-filter-admin', lastName: 'User' });
        const other = await commandSetup.withUser({ firstName: 'session-user-filter-other', lastName: 'User' });
        const matchId = idCreate();
        const missId = idCreate();
        await testDb.insert(sessions).values({
            sessionId: matchId,
            userId: setup.user.userId,
            userAgent: 'match-agent',
        });
        await testDb.insert(sessions).values({
            sessionId: missId,
            userId: other.user.userId,
            userAgent: 'miss-agent',
        });

        // Act
        const rows = await adminSessionFindMany(
            { criterion: { skip: 0, take: 100, kinds: [...allKinds], userIds: [setup.user.userId] } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        const ids = new Set(rows.map((row) => row.sessionId));
        expect(ids.has(matchId)).toBe(true);
        expect(ids.has(missId)).toBe(false);
    });
});
