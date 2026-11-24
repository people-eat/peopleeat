import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cities, sessionEvents } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminWebPageVisitEntitySearch } from './adminWebPageVisitEntitySearch';

function isolatedRange() {
    const startMs = Date.UTC(2400, 0, 1) + Math.floor(Math.random() * 1e12);
    return {
        startDateTime: new Date(startMs),
        endDateTime: new Date(startMs + 86_400_000),
        at: new Date(startMs + 3_600_000),
    };
}

describe('adminWebPageVisitEntitySearch', () => {
    it('finds a city by name and includes visit counts', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        const cityId = idCreate();
        const range = isolatedRange();
        await testDb.insert(cities).values({
            cityId,
            pathName: `city-${cityId.slice(0, 8).toLowerCase()}`,
            nameDe: 'Suchstadt',
            nameEn: 'Berlin',
            latitude: 52.52,
            longitude: 13.405,
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });
        await testDb.insert(sessionEvents).values({
            sessionEventId: idCreate(),
            sessionId: requestingSession.sessionId,
            type: 'WEB_PAGE_VISITED',
            payload: { webPageKey: 'CITIES', path: `/cities/${cityId}`, params: { cityId } },
            createdAt: range.at,
        });

        const rows = await adminWebPageVisitEntitySearch(
            { webPageKey: 'CITIES', query: 'Such', range, audience: 'HUMAN' },
            requestingSession,
            serverRuntime,
        );

        expect(rows).toEqual(expect.arrayContaining([expect.objectContaining({ id: cityId, pageviews: 1, uniqueSessions: 1 })]));
        expect(rows[0]?.id).toBe(cityId);
        await expect(
            adminWebPageVisitEntitySearch(
                { webPageKey: 'CITIES', query: 'Nowhere', range, audience: 'HUMAN' },
                requestingSession,
                serverRuntime,
            ),
        ).resolves.toEqual([]);
    });
});
