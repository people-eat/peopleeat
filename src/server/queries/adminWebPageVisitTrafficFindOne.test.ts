import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { WEB_PAGE_VISIT_INDEX_RANK_ID } from '../../shared/webPage';
import { cities, sessionEvents, sessions } from '../db/schema';
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

        const cityList = await adminWebPageVisitTrafficFindOne(
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

        expect(cityList.pageviews).toBe(1);
        expect(cityList.entityVisitCount).toBe(1);
        expect(cityList.untaggedDetailVisitCount).toBe(0);
        expect(cityList.entityRanks).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: cityId, pageviews: 1, uniqueSessions: 1 })]),
        );
        expect(cityList.entityRanks[0]?.id).toBe(cityId);
    });

    it('ranks venue index visits', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const range = isolatedRange();
        await testDb.insert(sessionEvents).values({
            sessionEventId: idCreate(),
            sessionId: requestingSession.sessionId,
            type: 'WEB_PAGE_VISITED',
            payload: { webPageKey: 'VENUES', path: '/venues' },
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
        expect(traffic.entityRanks[0]).toEqual(
            expect.objectContaining({ id: WEB_PAGE_VISIT_INDEX_RANK_ID, pageviews: 1, uniqueSessions: 1 }),
        );
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

    it('ranks venue detail visits with the stable venue id', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const venue = await partnerVenueInsert({ name: 'Loft' });
        const range = isolatedRange();
        await testDb.insert(sessionEvents).values({
            sessionEventId: idCreate(),
            sessionId: requestingSession.sessionId,
            type: 'WEB_PAGE_VISITED',
            payload: {
                webPageKey: 'VENUES',
                path: `/venues/${venue.pathName}`,
                params: { partnerVenueId: venue.partnerVenueId },
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
        expect(traffic.entityRanks).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: venue.partnerVenueId, pageviews: 1, uniqueSessions: 1 })]),
        );
        expect(traffic.entityRanks[0]?.id).toBe(venue.partnerVenueId);
    });

    it('overlays multiple city series without summing unique sessions', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const berlinId = idCreate();
        const munichId = idCreate();
        const range = isolatedRange();
        await testDb.insert(sessionEvents).values([
            {
                sessionEventId: idCreate(),
                sessionId: requestingSession.sessionId,
                type: 'WEB_PAGE_VISITED',
                payload: { webPageKey: 'CITIES', path: `/cities/${berlinId}`, params: { cityId: berlinId } },
                createdAt: range.at,
            },
            {
                sessionEventId: idCreate(),
                sessionId: requestingSession.sessionId,
                type: 'WEB_PAGE_VISITED',
                payload: { webPageKey: 'CITIES', path: `/cities/${munichId}`, params: { cityId: munichId } },
                createdAt: range.at,
            },
        ]);

        const traffic = await adminWebPageVisitTrafficFindOne(
            {
                range,
                granularity: 'day',
                webPageKeys: ['CITIES'],
                audience: 'HUMAN',
                metric: 'PAGEVIEWS',
                scope: 'ALL',
                entity: { cityIds: [berlinId, munichId], cookIds: [], partnerVenueIds: [], occasionIds: [], blogPostIds: [] },
            },
            requestingSession,
            serverRuntime,
        );

        expect(traffic.series).toHaveLength(2);
        expect(traffic.series.map((row) => row.entityId).sort()).toEqual([berlinId, munichId].sort());
        expect(traffic.series.every((row) => row.pageviews === 1 && row.uniqueSessions === 1)).toBe(true);
        expect(traffic.pageviews).toBe(2);
        expect(traffic.uniqueSessions).toBe(1);
    });

    it('ranks pages by unique sessions when that metric is selected', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const otherSessionId = idCreate();
        await testDb.insert(sessions).values({ sessionId: otherSessionId });
        const range = isolatedRange();
        await testDb.insert(sessionEvents).values([
            {
                sessionEventId: idCreate(),
                sessionId: requestingSession.sessionId,
                type: 'WEB_PAGE_VISITED',
                payload: { webPageKey: 'SIGN_IN', path: '/log-on' },
                createdAt: range.at,
            },
            {
                sessionEventId: idCreate(),
                sessionId: requestingSession.sessionId,
                type: 'WEB_PAGE_VISITED',
                payload: { webPageKey: 'SIGN_IN', path: '/log-on' },
                createdAt: range.at,
            },
            {
                sessionEventId: idCreate(),
                sessionId: otherSessionId,
                type: 'WEB_PAGE_VISITED',
                payload: { webPageKey: 'LANDING', path: '/' },
                createdAt: range.at,
            },
            {
                sessionEventId: idCreate(),
                sessionId: requestingSession.sessionId,
                type: 'WEB_PAGE_VISITED',
                payload: { webPageKey: 'LANDING', path: '/' },
                createdAt: range.at,
            },
        ]);

        const traffic = await adminWebPageVisitTrafficFindOne(
            {
                range,
                granularity: 'day',
                webPageKeys: [],
                audience: 'ALL',
                metric: 'UNIQUE_SESSIONS',
                scope: 'ALL',
                entity: null,
            },
            requestingSession,
            serverRuntime,
        );

        expect(traffic.pageRanks[0]?.webPageKey).toBe('LANDING');
        expect(traffic.pageRanks[0]?.uniqueSessions).toBe(2);
        expect(traffic.pageRanks[1]?.webPageKey).toBe('SIGN_IN');
        expect(traffic.pageRanks[1]?.pageviews).toBe(2);
    });

    it('includes the overview id in a chefs comparison set', async () => {
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

        const traffic = await adminWebPageVisitTrafficFindOne(
            {
                range,
                granularity: 'day',
                webPageKeys: ['CHEFS'],
                audience: 'HUMAN',
                metric: 'PAGEVIEWS',
                scope: 'ALL',
                entity: {
                    cookIds: [WEB_PAGE_VISIT_INDEX_RANK_ID, cookId],
                    cityIds: [],
                    partnerVenueIds: [],
                    occasionIds: [],
                    blogPostIds: [],
                },
            },
            requestingSession,
            serverRuntime,
        );

        expect(traffic.series.map((row) => row.entityId)).toEqual([WEB_PAGE_VISIT_INDEX_RANK_ID, cookId]);
        expect(traffic.series[0]?.pageviews).toBe(1);
        expect(traffic.series[1]?.pageviews).toBe(1);
    });

    it('lists catalog cities with zero visits in the ranking', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const cityId = idCreate();
        const range = isolatedRange();
        await testDb.insert(cities).values({
            cityId,
            pathName: `city-${cityId.slice(0, 8).toLowerCase()}`,
            nameDe: 'Hamburg',
            nameEn: 'Berlin',
            latitude: 52.52,
            longitude: 13.405,
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });

        const traffic = await adminWebPageVisitTrafficFindOne(
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

        expect(traffic.entityRanks).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: cityId, pageviews: 0, uniqueSessions: 0 })]),
        );
    });

    it('ranks booking-request plan visits by venueId query param', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const venue = await partnerVenueInsert({ name: 'Loft' });
        const range = isolatedRange();
        await testDb.insert(sessionEvents).values([
            {
                sessionEventId: idCreate(),
                sessionId: requestingSession.sessionId,
                type: 'WEB_PAGE_VISITED',
                payload: { webPageKey: 'BOOKING_REQUEST_PLAN', path: '/booking-request/plan' },
                createdAt: range.at,
            },
            {
                sessionEventId: idCreate(),
                sessionId: requestingSession.sessionId,
                type: 'WEB_PAGE_VISITED',
                payload: {
                    webPageKey: 'BOOKING_REQUEST_PLAN',
                    path: `/booking-request/plan?venueId=${venue.partnerVenueId}`,
                    params: { partnerVenueId: venue.partnerVenueId },
                },
                createdAt: range.at,
            },
        ]);

        const traffic = await adminWebPageVisitTrafficFindOne(
            {
                range,
                granularity: 'day',
                webPageKeys: ['BOOKING_REQUEST_PLAN'],
                audience: 'HUMAN',
                metric: 'PAGEVIEWS',
                scope: 'ALL',
                entity: null,
            },
            requestingSession,
            serverRuntime,
        );

        expect(traffic.pageviews).toBe(2);
        expect(traffic.entityVisitCount).toBe(1);
        expect(traffic.entityRanks[0]).toEqual(
            expect.objectContaining({ id: WEB_PAGE_VISIT_INDEX_RANK_ID, pageviews: 1, uniqueSessions: 1 }),
        );
        expect(traffic.entityRanks).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: venue.partnerVenueId, pageviews: 1, uniqueSessions: 1 })]),
        );
    });
});
