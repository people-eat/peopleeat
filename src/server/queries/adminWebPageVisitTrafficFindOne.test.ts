import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { sessionEvents } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminWebPageVisitTrafficFindOne } from './adminWebPageVisitTrafficFindOne';

function isolatedRange() {
    const startMs = Date.UTC(2400, 0, 1) + Math.floor(Math.random() * 1e12);
    return {
        startDateTime: new Date(startMs),
        endDateTime: new Date(startMs + 86_400_000),
        at: new Date(startMs + 3_600_000),
    };
}

describe('adminWebPageVisitTrafficFindOne', () => {
    it('returns zero-filled series, page ranks, and entity ranks', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const cityId = idCreate();
        const range = isolatedRange();
        await testDb.insert(sessionEvents).values([
            {
                sessionEventId: idCreate(),
                sessionId: requestingSession.sessionId,
                type: 'WEB_PAGE_VISITED',
                payload: { webPageKey: 'LANDING', path: '/' },
                createdAt: range.at,
            },
            {
                sessionEventId: idCreate(),
                sessionId: requestingSession.sessionId,
                type: 'WEB_PAGE_VISITED',
                payload: { webPageKey: 'CITIES', path: `/cities/${cityId}`, params: { cityId } },
                createdAt: range.at,
            },
        ]);

        const allPages = await adminWebPageVisitTrafficFindOne(
            {
                range,
                granularity: 'day',
                webPageKeys: [],
                audience: 'HUMAN',
                metric: 'PAGEVIEWS',
                scope: 'ALL',
                entity: null,
            },
            requestingSession,
            serverRuntime,
        );

        expect(allPages.pageviews).toBe(2);
        expect(allPages.uniqueSessions).toBe(1);
        expect(allPages.series).toHaveLength(1);
        expect(allPages.series[0]?.webPageKey).toBeNull();
        expect(allPages.pageRanks.map((row) => row.webPageKey).sort()).toEqual(['CITIES', 'LANDING']);

        const cities = await adminWebPageVisitTrafficFindOne(
            {
                range,
                granularity: 'day',
                webPageKeys: ['CITIES'],
                audience: 'HUMAN',
                metric: 'PAGEVIEWS',
                scope: 'ALL',
                entity: null,
            },
            requestingSession,
            serverRuntime,
        );

        expect(cities.pageviews).toBe(1);
        expect(cities.entityVisitCount).toBe(1);
        expect(cities.untaggedDetailVisitCount).toBe(0);
        expect(cities.entityRanks).toEqual([expect.objectContaining({ id: cityId, pageviews: 1, uniqueSessions: 1 })]);
    });

    it('maps historical PARTNERS visits onto VENUES', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const range = isolatedRange();
        await testDb.insert(sessionEvents).values({
            sessionEventId: idCreate(),
            sessionId: requestingSession.sessionId,
            type: 'WEB_PAGE_VISITED',
            payload: { webPageKey: 'PARTNERS' as never, path: '/partners' },
            createdAt: range.at,
        });

        const traffic = await adminWebPageVisitTrafficFindOne(
            {
                range,
                granularity: 'day',
                webPageKeys: ['VENUES'],
                audience: 'HUMAN',
                metric: 'PAGEVIEWS',
                scope: 'ALL',
                entity: null,
            },
            requestingSession,
            serverRuntime,
        );

        expect(traffic.pageviews).toBe(1);
        expect(traffic.pageRanks).toEqual([expect.objectContaining({ webPageKey: 'VENUES', pageviews: 1 })]);
        expect(traffic.series[0]?.webPageKey).toBe('VENUES');
        expect(traffic.series[0]?.pageviews).toBe(1);
    });
});
