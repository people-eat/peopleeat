import { describe, expect, it, vi } from 'vitest';

import { commandSetup } from '../../test/commandTestUtils';
import { resendEmailQuotaAtRisk } from '../../utils/resendEmailQuotaAtRisk';
import { europeBerlinHour, resendUsageSlackAlertRun } from './resendUsageSlackAlert';

describe('europeBerlinHour', () => {
    it('maps winter UTC evening to Berlin hour 19', () => {
        // 2026-01-15 18:00 UTC = 19:00 Europe/Berlin (CET).
        expect(europeBerlinHour(new Date('2026-01-15T18:00:00.000Z'))).toBe(19);
    });

    it('maps summer UTC evening to Berlin hour 19', () => {
        // 2026-07-15 17:00 UTC = 19:00 Europe/Berlin (CEST).
        expect(europeBerlinHour(new Date('2026-07-15T17:00:00.000Z'))).toBe(19);
    });

    it('maps winter UTC late evening to Berlin midnight', () => {
        // 2026-01-15 23:00 UTC = 00:00 Europe/Berlin next day (CET).
        expect(europeBerlinHour(new Date('2026-01-15T23:00:00.000Z'))).toBe(0);
    });
});

describe('resendEmailQuotaAtRisk', () => {
    const resetsAt = new Date('2026-08-01T00:00:00.000Z');
    const midMonth = new Date('2026-07-16T00:00:00.000Z');

    it('is not at risk when usage is low', () => {
        const risk = resendEmailQuotaAtRisk({ used: 100, limit: 3000, resetsAt }, midMonth, 'monthly');
        expect(risk.atRisk).toBe(false);
        expect(risk.ratio).toBeCloseTo(100 / 3000);
    });

    it('is at risk at 80% used', () => {
        const risk = resendEmailQuotaAtRisk({ used: 2400, limit: 3000, resetsAt }, midMonth, 'monthly');
        expect(risk.atRisk).toBe(true);
    });

    it('is at risk when projection exceeds limit', () => {
        // 2000 used by day 10 of ~31-day period → projected ~6200 > 3000
        const early = new Date('2026-07-10T00:00:00.000Z');
        const risk = resendEmailQuotaAtRisk({ used: 2000, limit: 3000, resetsAt }, early, 'monthly');
        expect(risk.atRisk).toBe(true);
        expect(risk.projected).toBeGreaterThan(3000);
    });

    it('ignores windows without a limit', () => {
        const risk = resendEmailQuotaAtRisk({ used: 9999, limit: null, resetsAt }, midMonth, 'daily');
        expect(risk.atRisk).toBe(false);
        expect(risk.ratio).toBeNull();
    });
});

describe('resendUsageSlackAlertRun', () => {
    const healthyUsage = {
        monthly: {
            used: 100,
            limit: 3000,
            sent: 90,
            received: 10,
            resetsAt: new Date('2026-08-01T00:00:00.000Z'),
        },
        daily: {
            used: 5,
            limit: null,
            sent: 5,
            received: 0,
            resetsAt: new Date('2026-07-16T00:00:00.000Z'),
        },
    };

    const atRiskUsage = {
        ...healthyUsage,
        monthly: {
            ...healthyUsage.monthly,
            used: 2500,
            sent: 2400,
            received: 100,
        },
    };

    // 2026-07-15 17:00 UTC = 19:00 Europe/Berlin (CEST), mid monthly window.
    const berlinHour19 = new Date('2026-07-15T17:00:00.000Z');

    it('no-ops when opsAlerts channel is unset', async () => {
        const { serverRuntime } = await commandSetup();
        await resendUsageSlackAlertRun(serverRuntime, {
            now: berlinHour19,
            usage: atRiskUsage,
        });
        expect(serverRuntime.slack.postMessage).not.toHaveBeenCalled();
    });

    it('skips when Berlin hour is not 0 or 19', async () => {
        const { serverRuntime } = await commandSetup();
        serverRuntime.slack.channels.opsAlerts = 'C_OPS';
        await resendUsageSlackAlertRun(serverRuntime, {
            now: new Date('2026-07-15T12:00:00.000Z'),
            usage: atRiskUsage,
        });
        expect(serverRuntime.slack.postMessage).not.toHaveBeenCalled();
    });

    it('skips when quota is healthy', async () => {
        const { serverRuntime } = await commandSetup();
        serverRuntime.slack.channels.opsAlerts = 'C_OPS';
        await resendUsageSlackAlertRun(serverRuntime, {
            now: berlinHour19,
            usage: healthyUsage,
        });
        expect(serverRuntime.slack.postMessage).not.toHaveBeenCalled();
    });

    it('posts to opsAlerts when at risk at Berlin hour 19', async () => {
        const { serverRuntime } = await commandSetup();
        serverRuntime.slack.channels.opsAlerts = 'C_OPS';
        vi.mocked(serverRuntime.slack.postMessage).mockResolvedValue({ ts: '1.2' });

        await resendUsageSlackAlertRun(serverRuntime, {
            now: berlinHour19,
            usage: atRiskUsage,
        });

        expect(serverRuntime.slack.postMessage).toHaveBeenCalledTimes(1);
        const args = vi.mocked(serverRuntime.slack.postMessage).mock.calls[0]![0];
        expect(args.channel).toBe('C_OPS');
        expect(args.text).toBe('Resend E-Mail-Kontingent gefährdet');
        expect(args.blocks.length).toBeGreaterThan(0);
    });

    it('skips when usage is null (console transport)', async () => {
        const { serverRuntime } = await commandSetup();
        serverRuntime.slack.channels.opsAlerts = 'C_OPS';
        await resendUsageSlackAlertRun(serverRuntime, {
            now: berlinHour19,
            usage: null,
        });
        expect(serverRuntime.slack.postMessage).not.toHaveBeenCalled();
    });
});
