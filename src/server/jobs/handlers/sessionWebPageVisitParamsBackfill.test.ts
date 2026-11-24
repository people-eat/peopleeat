import { describe, expect, it, vi } from 'vitest';

import { idCreate } from '../../../shared/idCreate';
import { cities, sessionEvents } from '../../db/schema';
import { commandSetup, testDb } from '../../test/commandTestUtils';
import { sessionWebPageVisitParamsBackfillJob } from './sessionWebPageVisitParamsBackfill';

describe('sessionWebPageVisitParamsBackfillJob', () => {
    it('backfills missing params and does not re-enqueue when the chunk is done', async () => {
        const { serverRuntime, requestingSession } = await commandSetup();
        vi.mocked(serverRuntime.jobs.enqueue).mockResolvedValue('job_backfill');
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
        await testDb.insert(sessionEvents).values({
            sessionEventId: idCreate(),
            sessionId: requestingSession.sessionId,
            type: 'WEB_PAGE_VISITED',
            payload: { webPageKey: 'CITIES', path: `/cities/${cityPath}` },
        });

        await sessionWebPageVisitParamsBackfillJob.handler({ data: {}, serverRuntime });

        expect(serverRuntime.jobs.enqueue).not.toHaveBeenCalled();
    });
});
