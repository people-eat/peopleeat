import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { WEB_PAGE_VISIT_INDEX_RANK_ID } from '../../shared/webPage';
import { sessionEvents } from '../db/schema';
import { commandSetup, partnerVenueInsert, testDb } from '../test/commandTestUtils';
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
        expect(traffic.entityRanks).toEqual([
            expect.objectContaining({ id: WEB_PAGE_VISIT_INDEX_RANK_ID, pageviews: 1, uniqueSessions: 1 }),
        ]);
    });

    it('puts the catalog index first as an overview row', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const cookId = idCreate();
        const range = isolatedRange();
        await testDb.insert(sessionEvents).values([
            {
                sessionEventId: idCreate(),
                sessionId: requestingSession.sessionId,
                type: 'WEB_PAGE_VISITED',
                payload: { webPageKey: 'CHEFS', path: '/chefs' },
                createdAt: range.at,
            },
            {
                sessionEventId: idCreate(),
                sessionId: requestingSession.sessionId,
                type: 'WEB_PAGE_VISITED',
                payload: { webPageKey: 'CHEFS', path: `/chefs/${cookId}`, params: { cookId } },
                createdAt: range.at,
            },
        ]);

        const chefs = await adminWebPageVisitTrafficFindOne(
            {
                range,
                granularity: 'day',
                webPageKeys: ['CHEFS'],
                audience: 'HUMAN',
                metric: 'PAGEVIEWS',
                scope: 'ALL',
                entity: null,
            },
            requestingSession,
            serverRuntime,
        );

        expect(chefs.entityRanks[0]).toEqual(
            expect.objectContaining({ id: WEB_PAGE_VISIT_INDEX_RANK_ID, pageviews: 1, uniqueSessions: 1 }),
        );
        expect(chefs.entityRanks[1]).toEqual(expect.objectContaining({ id: cookId, pageviews: 1 }));
    });

    it('ranks historical partnerId venue visits with the stable venue id', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const venue = await partnerVenueInsert({ name: 'Loft' });
        const range = isolatedRange();
        await testDb.insert(sessionEvents).values({
            sessionEventId: idCreate(),
            sessionId: requestingSession.sessionId,
            type: 'WEB_PAGE_VISITED',
            payload: {
                webPageKey: 'PARTNERS' as never,
                path: `/partners/${venue.pathName}`,
                params: { partnerId: venue.partnerVenueId } as never,
            },
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
        expect(traffic.entityVisitCount).toBe(1);
        expect(traffic.entityRanks).toEqual([expect.objectContaining({ id: venue.partnerVenueId, pageviews: 1, uniqueSessions: 1 })]);
    });
});
