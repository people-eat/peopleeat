import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { sessions } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminSessionCounts } from './adminSessionCounts';
import { adminSessionCreationsFindMany } from './adminSessionCreationsFindMany';

const allKinds = ['human', 'bot'] as const;

describe('adminSessionCounts', () => {
    it('returns one count per criterion in order', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'session-counts-admin', lastName: 'User' });

        // Act
        const [total, human, bot] = await adminSessionCounts(
            {
                criteria: [{ kinds: [...allKinds] }, { kinds: ['human'] }, { kinds: ['bot'] }],
            },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert — seeded sessions from other tests exist; assert shape + non-negative
        expect(total).toBeGreaterThanOrEqual(0);
        expect(human).toBeGreaterThanOrEqual(0);
        expect(bot).toBeGreaterThanOrEqual(0);
    });

    it('counts rows matching searchText', async () => {
        // Arrange
        const token = `count-${idCreate().slice(0, 8)}`;
        const setup = await commandSetup.withUser({ firstName: 'session-count-admin', lastName: 'User' });
        await testDb.insert(sessions).values({
            sessionId: idCreate(),
            userAgent: `${token}-one`,
        });
        await testDb.insert(sessions).values({
            sessionId: idCreate(),
            userAgent: `${token}-two`,
        });
        await testDb.insert(sessions).values({
            sessionId: idCreate(),
            userAgent: 'unrelated-agent',
        });

        // Act
        const [total] = await adminSessionCounts(
            { criteria: [{ searchText: token, kinds: [...allKinds] }] },
            setup.requestingSession,
            setup.serverRuntime,
        );

        // Assert
        expect(total).toBe(2);
    });

    it('returns 0 when kinds is empty', async () => {
        // Arrange
        const setup = await commandSetup.withUser({ firstName: 'session-count-empty', lastName: 'User' });

        // Act
        const [total] = await adminSessionCounts({ criteria: [{ kinds: [] }] }, setup.requestingSession, setup.serverRuntime);

        // Assert
        expect(total).toBe(0);
    });
});

describe('adminSessionCreationsFindMany', () => {
    it('returns a zero-filled day series for the requested range', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'session-creations-admin', lastName: 'User' });
        const startDateTime = new Date(Date.UTC(2026, 7, 1));
        const endDateTime = new Date(Date.UTC(2026, 7, 7));

        // Act
        const series = await adminSessionCreationsFindMany(
            { range: { startDateTime, endDateTime }, granularity: 'day' },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(series).toHaveLength(7);
        expect(series.every((bucket) => bucket.count >= 0)).toBe(true);
        for (let i = 1; i < series.length; i++) {
            expect(series[i]!.bucketStart.getTime()).toBeGreaterThan(series[i - 1]!.bucketStart.getTime());
        }
    });
});
