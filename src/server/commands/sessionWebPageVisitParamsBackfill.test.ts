import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cities, sessionEvents } from '../db/schema';
import { commandSetup, partnerVenueInsert, testDb } from '../test/commandTestUtils';
import { sessionWebPageVisitParamsBackfill } from './sessionWebPageVisitParamsBackfill';

describe('sessionWebPageVisitParamsBackfill', () => {
    it('fills missing cityId from the stored path', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const cityId = idCreate();
        const cityPath = `city-${cityId.slice(0, 8).toLowerCase()}`;
        await testDb.insert(cities).values({
            cityId,
            pathName: cityPath,
            nameDe: 'Berlin',
            latitude: 52.52,
            longitude: 13.405,
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });
        const sessionEventId = idCreate();
        await testDb.insert(sessionEvents).values({
            sessionEventId,
            sessionId: requestingSession.sessionId,
            type: 'WEB_PAGE_VISITED',
            payload: { webPageKey: 'CITIES', path: `/cities/${cityPath}` },
        });

        const result = await sessionWebPageVisitParamsBackfill(serverRuntime, { limit: 50 });

        expect(result.updated).toBeGreaterThanOrEqual(1);
        const [row] = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionEventId, sessionEventId));
        expect(row?.payload).toMatchObject({
            webPageKey: 'CITIES',
            path: `/cities/${cityPath}`,
            params: { cityId },
        });
    });

    it('skips index-page visits that have no entity segment', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const sessionEventId = idCreate();
        await testDb.insert(sessionEvents).values({
            sessionEventId,
            sessionId: requestingSession.sessionId,
            type: 'WEB_PAGE_VISITED',
            payload: { webPageKey: 'CITIES', path: '/cities' },
        });

        await sessionWebPageVisitParamsBackfill(serverRuntime, { limit: 50 });

        const [row] = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionEventId, sessionEventId));
        expect(row?.payload).toEqual({ webPageKey: 'CITIES', path: '/cities' });
    });

    it('fills missing partnerVenueId from the stored path', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const venue = await partnerVenueInsert({ name: 'Loft' });
        const sessionEventId = idCreate();
        await testDb.insert(sessionEvents).values({
            sessionEventId,
            sessionId: requestingSession.sessionId,
            type: 'WEB_PAGE_VISITED',
            payload: {
                webPageKey: 'VENUES',
                path: `/venues/${venue.pathName}`,
            },
        });

        await sessionWebPageVisitParamsBackfill(serverRuntime, { limit: 50 });

        const [row] = await testDb.select().from(sessionEvents).where(eq(sessionEvents.sessionEventId, sessionEventId));
        expect(row?.payload).toMatchObject({
            webPageKey: 'VENUES',
            path: `/venues/${venue.pathName}`,
            params: { partnerVenueId: venue.partnerVenueId },
        });
    });
});
