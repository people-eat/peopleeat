import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { logs } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminLogFindMany } from './adminLogFindMany';

const ALL_LEVELS = ['error', 'warn', 'info', 'debug'] as const;

describe('adminLogFindMany', () => {
    it('returns seeded logs ordered by createdAt descending', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `order-${idCreate().slice(0, 8)}`;
        const olderId = idCreate();
        const newerId = idCreate();
        await testDb.insert(logs).values([
            {
                logId: olderId,
                level: 'info',
                message: `${token}-older`,
                createdAt: new Date('2024-01-01T00:00:00.000Z'),
            },
            {
                logId: newerId,
                level: 'info',
                message: `${token}-newer`,
                createdAt: new Date('2024-06-01T00:00:00.000Z'),
            },
        ]);

        // Act
        const rows = await adminLogFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, levels: [...ALL_LEVELS] } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.logId)).toEqual([newerId, olderId]);
    });

    it('filters by searchText against message and by levels', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `filter-${idCreate().slice(0, 8)}`;
        const matchId = idCreate();
        const levelMissId = idCreate();
        const textMissId = idCreate();
        await testDb.insert(logs).values([
            { logId: matchId, level: 'error', message: `${token}-match` },
            { logId: levelMissId, level: 'debug', message: `${token}-debug` },
            { logId: textMissId, level: 'error', message: 'unrelated-message' },
        ]);

        // Act
        const rows = await adminLogFindMany(
            { criterion: { skip: 0, take: 100, searchText: token, levels: ['error', 'warn'] } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(rows.map((row) => row.logId)).toEqual([matchId]);
    });

    it('paginates with skip and take', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `page-${idCreate().slice(0, 8)}`;
        const ids = [idCreate(), idCreate(), idCreate()];
        await testDb.insert(logs).values(
            ids.map((logId, index) => ({
                logId,
                level: 'warn' as const,
                message: `${token}-${index}`,
                createdAt: new Date(`2024-03-0${index + 1}T00:00:00.000Z`),
            })),
        );

        // Act
        const page = await adminLogFindMany(
            { criterion: { skip: 0, take: 2, searchText: token, levels: [...ALL_LEVELS] } },
            requestingSession,
            serverRuntime,
        );
        const next = await adminLogFindMany(
            { criterion: { skip: 2, take: 2, searchText: token, levels: [...ALL_LEVELS] } },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(page).toHaveLength(2);
        expect(next).toHaveLength(1);
        expect(new Set([...page, ...next].map((row) => row.logId)).size).toBe(3);
    });

    it('returns an empty list when levels is empty', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();

        // Act
        const rows = await adminLogFindMany({ criterion: { skip: 0, take: 25, levels: [] } }, requestingSession, serverRuntime);

        // Assert
        expect(rows).toEqual([]);
    });
});
