import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { logs } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminLogCounts } from './adminLogCounts';
import { adminLogCreationsFindMany } from './adminLogCreationsFindMany';

const ALL_LEVELS = ['error', 'warn', 'info', 'debug'] as const;

describe('adminLogCounts', () => {
    it('returns one count per criterion in order', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `counts-${idCreate().slice(0, 8)}`;
        await testDb.insert(logs).values([
            { logId: idCreate(), level: 'error', message: `${token}-error` },
            { logId: idCreate(), level: 'warn', message: `${token}-warn` },
            { logId: idCreate(), level: 'info', message: `${token}-info` },
            { logId: idCreate(), level: 'debug', message: `${token}-debug` },
        ]);

        // Act
        const [total, error, warn, info, debug] = await adminLogCounts(
            {
                criteria: [
                    { levels: [...ALL_LEVELS] },
                    { levels: ['error'] },
                    { levels: ['warn'] },
                    { levels: ['info'] },
                    { levels: ['debug'] },
                ],
            },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(total).toBeGreaterThanOrEqual(4);
        expect(error).toBeGreaterThanOrEqual(1);
        expect(warn).toBeGreaterThanOrEqual(1);
        expect(info).toBeGreaterThanOrEqual(1);
        expect(debug).toBeGreaterThanOrEqual(1);
    });

    it('counts rows matching searchText and levels', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `count-${idCreate().slice(0, 8)}`;
        await testDb.insert(logs).values([
            { logId: idCreate(), level: 'error', message: `${token}-match` },
            { logId: idCreate(), level: 'error', message: `${token}-also` },
            { logId: idCreate(), level: 'debug', message: `${token}-debug` },
            { logId: idCreate(), level: 'error', message: 'unrelated-message' },
        ]);

        // Act
        const [total] = await adminLogCounts(
            { criteria: [{ searchText: token, levels: ['error', 'warn'] }] },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(total).toBe(2);
    });

    it('returns 0 when levels is empty', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();

        // Act
        const [total] = await adminLogCounts({ criteria: [{ levels: [] }] }, requestingSession, serverRuntime);

        // Assert
        expect(total).toBe(0);
    });

    it('counts all levels when every level is passed', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const token = `all-${idCreate().slice(0, 8)}`;
        await testDb.insert(logs).values([
            { logId: idCreate(), level: 'info', message: `${token}-a` },
            { logId: idCreate(), level: 'warn', message: `${token}-b` },
            { logId: idCreate(), level: 'error', message: `${token}-c` },
        ]);

        // Act
        const [total] = await adminLogCounts(
            { criteria: [{ searchText: token, levels: [...ALL_LEVELS] }] },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(total).toBe(3);
    });

    it('rejects an empty criteria list', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();

        // Act / Assert
        await expect(adminLogCounts({ criteria: [] }, requestingSession, serverRuntime)).rejects.toThrow(/criteria must not be empty/);
    });
});

describe('adminLogCreationsFindMany', () => {
    it('returns a zero-filled day series for the requested range', async () => {
        // Arrange
        const { requestingSession, serverRuntime } = await commandSetup.withUser();
        const startDateTime = new Date(Date.UTC(2026, 7, 1));
        const endDateTime = new Date(Date.UTC(2026, 7, 5));

        // Act
        const series = await adminLogCreationsFindMany(
            { range: { startDateTime, endDateTime }, granularity: 'day' },
            requestingSession,
            serverRuntime,
        );

        // Assert
        expect(series).toHaveLength(5);
        expect(series.every((bucket) => bucket.count >= 0)).toBe(true);
        for (let i = 1; i < series.length; i++) {
            expect(series[i]!.bucketStart.getTime()).toBeGreaterThan(series[i - 1]!.bucketStart.getTime());
        }
    });
});
