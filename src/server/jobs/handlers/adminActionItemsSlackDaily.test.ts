import { describe, expect, it, vi } from 'vitest';

import { commandSetup } from '../../test/commandTestUtils';
import { adminActionItemsSlackDailyRun, europeBerlinHour } from './adminActionItemsSlackDaily';

describe('europeBerlinHour', () => {
    it('maps winter UTC morning to Berlin hour 8', () => {
        // 2026-01-15 07:00 UTC = 08:00 Europe/Berlin (CET).
        expect(europeBerlinHour(new Date('2026-01-15T07:00:00.000Z'))).toBe(8);
    });

    it('maps summer UTC morning to Berlin hour 8', () => {
        // 2026-07-15 06:00 UTC = 08:00 Europe/Berlin (CEST).
        expect(europeBerlinHour(new Date('2026-07-15T06:00:00.000Z'))).toBe(8);
    });
});

describe('adminActionItemsSlackDailyRun', () => {
    it('no-ops when opsAlerts channel is unset', async () => {
        const { serverRuntime } = await commandSetup();
        await adminActionItemsSlackDailyRun(serverRuntime, {
            now: new Date('2026-01-15T07:00:00.000Z'),
        });
        expect(serverRuntime.slack.postMessage).not.toHaveBeenCalled();
    });

    it('skips when Berlin hour is not 8', async () => {
        const { serverRuntime } = await commandSetup();
        serverRuntime.slack.channels.opsAlerts = 'C_OPS';
        await adminActionItemsSlackDailyRun(serverRuntime, {
            now: new Date('2026-01-15T08:00:00.000Z'),
        });
        expect(serverRuntime.slack.postMessage).not.toHaveBeenCalled();
    });

    it('posts to opsAlerts at Berlin hour 8', async () => {
        const { serverRuntime } = await commandSetup();
        serverRuntime.slack.channels.opsAlerts = 'C_OPS';
        vi.mocked(serverRuntime.slack.postMessage).mockResolvedValue({ ts: '1.2' });

        await adminActionItemsSlackDailyRun(serverRuntime, {
            now: new Date('2026-01-15T07:00:00.000Z'),
        });

        expect(serverRuntime.slack.postMessage).toHaveBeenCalledTimes(1);
        const args = vi.mocked(serverRuntime.slack.postMessage).mock.calls[0]![0];
        expect(args.channel).toBe('C_OPS');
        expect(args.text).toBe('Admin Aktionsübersicht');
        expect(args.blocks.length).toBeGreaterThan(0);
    });
});
