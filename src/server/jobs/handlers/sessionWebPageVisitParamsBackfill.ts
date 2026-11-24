import { sessionWebPageVisitParamsBackfill } from '../../commands/sessionWebPageVisitParamsBackfill';
import type { QueuedJobDefinition } from '../types';

type SessionWebPageVisitParamsBackfillData = Record<string, unknown>;

export const sessionWebPageVisitParamsBackfillJob: QueuedJobDefinition<SessionWebPageVisitParamsBackfillData> = {
    kind: 'queued',
    name: 'session-web-page-visit-params-backfill',
    handler: async ({ serverRuntime }) => {
        try {
            const result = await sessionWebPageVisitParamsBackfill(serverRuntime);
            if (!result.done) {
                await serverRuntime.jobs.enqueue(
                    sessionWebPageVisitParamsBackfillJob,
                    {},
                    {
                        singletonKey: 'session-web-page-visit-params-backfill',
                    },
                );
            }
        } catch (error) {
            serverRuntime.log.error(error, null);
            throw error;
        }
    },
    options: {
        retryLimit: 2,
        retryDelay: 30,
        expireInSeconds: 120,
    },
};
