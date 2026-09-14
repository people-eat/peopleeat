import type { EmailUsage } from '../../domain/outboundEmail';
import type { ServerRuntime } from '../../domain/ServerRuntime';
import { resendUsageSlackMessageBuild } from '../../slack/resendUsageSlackMessage';
import { europeBerlinHour } from '../../utils/europeBerlinHour';
import { resendEmailQuotaAtRisk } from '../../utils/resendEmailQuotaAtRisk';
import type { RecurringJobDefinition } from '../types';

export { europeBerlinHour };

/**
 * Twice-daily Resend quota check to the ops-alerts Slack channel.
 * Cron fires at 17/18/22/23 UTC; handler only posts when Berlin local hour is 0
 * or 19 so DST keeps the wall clock at 00:00 / 19:00 Europe/Berlin.
 * Silent when healthy, console transport, or ops channel unset.
 */
export async function resendUsageSlackAlertRun(
    serverRuntime: ServerRuntime,
    options?: { now?: Date; usage?: EmailUsage | null },
): Promise<void> {
    const channelId = serverRuntime.slack.channels.opsAlerts;
    if (!channelId) {
        return;
    }

    const now = options?.now ?? new Date();
    const hour = europeBerlinHour(now);
    if (hour !== 0 && hour !== 19) {
        return;
    }

    let usage: EmailUsage | null;
    if (options?.usage !== undefined) {
        usage = options.usage;
    } else {
        try {
            usage = await serverRuntime.email.usageGet();
        } catch (error) {
            serverRuntime.log.error(error);
            return;
        }
    }
    if (usage == null) {
        return;
    }

    const monthlyRisk = resendEmailQuotaAtRisk(usage.monthly, now, 'monthly');
    const dailyRisk =
        usage.daily.limit != null ? resendEmailQuotaAtRisk(usage.daily, now, 'daily') : { atRisk: false, ratio: null, projected: null };

    if (!monthlyRisk.atRisk && !dailyRisk.atRisk) {
        return;
    }

    const { text, blocks } = resendUsageSlackMessageBuild({
        monthly: usage.monthly,
        daily: usage.daily,
        monthlyRisk,
        dailyRisk,
        now,
    });
    await serverRuntime.slack.postMessage({ channel: channelId, text, blocks });
}

export const resendUsageSlackAlert: RecurringJobDefinition = {
    kind: 'recurring',
    name: 'resend-usage-slack-alert',
    // 17/18 UTC ≈ 19:00 CEST/CET; 22/23 UTC ≈ 00:00 CEST/CET. Handler gates on Berlin hour.
    cron: '0 17,18,22,23 * * *',
    handler: async ({ serverRuntime }) => {
        await resendUsageSlackAlertRun(serverRuntime);
    },
    options: {
        retryLimit: 1,
        retryDelay: 60,
        expireInSeconds: 600,
    },
};
