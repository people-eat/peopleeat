import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, cooks, users } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminUserFindMany } from './adminUserFindMany';

const allTypes = ['customer', 'cook', 'admin'] as const;

describe('adminUserFindMany', () => {
    it('returns seeded users ordered by createdAt descending', async () => {
        // Arrange
        const older = await commandSetup.withUser({ firstName: 'older-user', lastName: 'User' });
        const newer = await commandSetup.withUser({ firstName: 'newer-user', lastName: 'User' });

        // Act
        const rows = await adminUserFindMany(
            { criterion: { skip: 0, take: 100, types: [...allTypes] } },
            older.requestingSession,
            older.serverRuntime,
        );

        // Assert
        const olderIdx = rows.findIndex((row) => row.userId === older.user.userId);
        const newerIdx = rows.findIndex((row) => row.userId === newer.user.userId);
        expect(newerIdx).toBeGreaterThanOrEqual(0);
        expect(olderIdx).toBeGreaterThanOrEqual(0);
        expect(newerIdx).toBeLessThan(olderIdx);
        expect(rows[newerIdx]).toMatchObject({
            userId: newer.user.userId,
            firstName: 'newer-user',
            lastName: 'User',
            emailAddress: newer.user.emailAddress,
        });
        expect(rows[olderIdx]).toMatchObject({
            userId: older.user.userId,
            firstName: 'older-user',
            lastName: 'User',
            emailAddress: older.user.emailAddress,
        });
    });

    it('filters by searchText against name and email', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'search-admin', lastName: 'User' });
        const matchName = await commandSetup.withUser({ firstName: 'UniqueSearchName', lastName: 'User' });
        const fullToken = `NmOrd${idCreate().slice(0, 8)}`;
        const matchFull = await commandSetup.withUser({ firstName: 'Zelda', lastName: fullToken });
        const matchEmailId = idCreate();
        const matchEmail = `unique-search-email-${matchEmailId}@example.com`;
        await testDb.insert(users).values({
            userId: matchEmailId,
            firstName: 'other-name',
            lastName: 'User',
            emailAddress: matchEmail,
        });
        const miss = await commandSetup.withUser({ firstName: 'no-match-here', lastName: 'User' });

        // Act
        const byName = await adminUserFindMany(
            { criterion: { skip: 0, take: 100, searchText: 'UniqueSearchName', types: [...allTypes] } },
            admin.requestingSession,
            admin.serverRuntime,
        );
        const byFirstLast = await adminUserFindMany(
            { criterion: { skip: 0, take: 100, searchText: `Zelda ${fullToken}`, types: [...allTypes] } },
            admin.requestingSession,
            admin.serverRuntime,
        );
        const byLastFirst = await adminUserFindMany(
            { criterion: { skip: 0, take: 100, searchText: `${fullToken} Zelda`, types: [...allTypes] } },
            admin.requestingSession,
            admin.serverRuntime,
        );
        const byEmail = await adminUserFindMany(
            { criterion: { skip: 0, take: 100, searchText: 'unique-search-email', types: [...allTypes] } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(byName.some((row) => row.userId === matchName.user.userId)).toBe(true);
        expect(byName.some((row) => row.userId === miss.user.userId)).toBe(false);
        expect(byFirstLast.some((row) => row.userId === matchFull.user.userId)).toBe(true);
        expect(byLastFirst.some((row) => row.userId === matchFull.user.userId)).toBe(true);
        expect(byEmail.some((row) => row.userId === matchEmailId)).toBe(true);
        expect(byEmail.some((row) => row.userId === miss.user.userId)).toBe(false);
    });

    it('paginates with skip and take', async () => {
        // Arrange
        const token = `page-${idCreate().slice(0, 8)}`;
        const first = await commandSetup.withUser({ firstName: `${token}-first`, lastName: 'User' });
        await commandSetup.withUser({ firstName: `${token}-second`, lastName: 'User' });
        await commandSetup.withUser({ firstName: `${token}-third`, lastName: 'User' });

        // Act
        const page = await adminUserFindMany(
            { criterion: { skip: 0, take: 2, searchText: token, types: [...allTypes] } },
            first.requestingSession,
            first.serverRuntime,
        );
        const next = await adminUserFindMany(
            { criterion: { skip: 2, take: 2, searchText: token, types: [...allTypes] } },
            first.requestingSession,
            first.serverRuntime,
        );

        // Assert
        expect(page).toHaveLength(2);
        expect(next).toHaveLength(1);
        expect(new Set([...page, ...next].map((row) => row.userId)).size).toBe(3);
    });

    it('returns no rows when types is empty', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'empty-types-user', lastName: 'User' });

        // Act
        const rows = await adminUserFindMany(
            { criterion: { skip: 0, take: 100, types: [] } },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(rows).toEqual([]);
    });

    it('filters by userIds', async () => {
        // Arrange
        const match = await commandSetup.withUser({ firstName: 'id-match', lastName: 'User' });
        const other = await commandSetup.withUser({ firstName: 'id-other', lastName: 'User' });

        // Act
        const byId = await adminUserFindMany(
            { criterion: { skip: 0, take: 100, types: [...allTypes], userIds: [match.user.userId] } },
            match.requestingSession,
            match.serverRuntime,
        );
        const unknown = await adminUserFindMany(
            { criterion: { skip: 0, take: 100, types: [...allTypes], userIds: [idCreate()] } },
            match.requestingSession,
            match.serverRuntime,
        );
        const emptyIds = await adminUserFindMany(
            {
                criterion: {
                    skip: 0,
                    take: 100,
                    types: [...allTypes],
                    searchText: 'id-match',
                    userIds: [],
                },
            },
            match.requestingSession,
            match.serverRuntime,
        );
        const andSearch = await adminUserFindMany(
            {
                criterion: {
                    skip: 0,
                    take: 100,
                    types: [...allTypes],
                    userIds: [match.user.userId, other.user.userId],
                    searchText: 'id-match',
                },
            },
            match.requestingSession,
            match.serverRuntime,
        );

        // Assert
        expect(byId.map((row) => row.userId)).toEqual([match.user.userId]);
        expect(unknown).toEqual([]);
        expect(emptyIds.some((row) => row.userId === match.user.userId)).toBe(true);
        expect(andSearch.map((row) => row.userId)).toEqual([match.user.userId]);
    });

    it('filters by AdminUserType membership', async () => {
        // Arrange
        const token = `type-${idCreate().slice(0, 8)}`;
        const setup = await commandSetup.withUser({ firstName: `${token}-customer`, lastName: 'User' });
        const cookUser = await commandSetup.withUser({ firstName: `${token}-cook`, lastName: 'User' });
        const adminUser = await commandSetup.withUser({ firstName: `${token}-admin`, lastName: 'User' });
        await testDb.insert(cooks).values({ cookId: cookUser.user.userId });
        await testDb.insert(admins).values({ adminId: adminUser.user.userId });

        // Act
        const customers = await adminUserFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, types: ['customer'] } },
            setup.requestingSession,
            setup.serverRuntime,
        );
        const cooksOnly = await adminUserFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, types: ['cook'] } },
            setup.requestingSession,
            setup.serverRuntime,
        );
        const adminsOnly = await adminUserFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, types: ['admin'] } },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(customers.map((row) => row.userId).sort()).toEqual([setup.user.userId, adminUser.user.userId].sort());
        expect(cooksOnly.map((row) => row.userId)).toEqual([cookUser.user.userId]);
        expect(adminsOnly.map((row) => row.userId)).toEqual([adminUser.user.userId]);
    });
});
