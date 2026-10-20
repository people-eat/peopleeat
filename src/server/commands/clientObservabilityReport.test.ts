import { describe, expect, it, vi } from 'vitest';

import { commandSetup } from '../test/commandTestUtils';
import { clientObservabilityReport } from './clientObservabilityReport';

describe('clientObservabilityReport', () => {
    it('accepts web vitals without writing error logs', async () => {
        const { requestingSession, serverRuntime } = await commandSetup();
        const error = vi.spyOn(serverRuntime.log, 'error');

        const result = await clientObservabilityReport(
            { input: { kind: 'WEB_VITAL', vitalName: 'LCP', value: 1200, path: '/gift-card' } },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(error).not.toHaveBeenCalled();
    });

    it('logs GraphQL client errors and still succeeds', async () => {
        const { requestingSession, serverRuntime } = await commandSetup();
        const error = vi.spyOn(serverRuntime.log, 'error');

        const result = await clientObservabilityReport(
            {
                input: {
                    kind: 'GRAPHQL_ERROR',
                    operationName: 'GiftCardCreate',
                    message: 'Unauthorized',
                    path: '/gift-card',
                },
            },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(error).toHaveBeenCalled();
    });

    it('skips Logs for benign browser network failures', async () => {
        const { requestingSession, serverRuntime } = await commandSetup();
        const error = vi.spyOn(serverRuntime.log, 'error');

        const result = await clientObservabilityReport(
            {
                input: {
                    kind: 'GRAPHQL_ERROR',
                    operationName: 'AdminSidebarNavBadgesUpdates',
                    message: 'Load failed',
                    path: '/admin/booking-requests/x',
                },
            },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
        expect(error).not.toHaveBeenCalled();
    });

    it('soft-succeeds on invalid web vital input', async () => {
        const { requestingSession, serverRuntime } = await commandSetup();

        const result = await clientObservabilityReport(
            { input: { kind: 'WEB_VITAL', vitalName: 'LCP', value: -1 } },
            requestingSession,
            serverRuntime,
        );

        expect(result.success).toBe(true);
    });
});
