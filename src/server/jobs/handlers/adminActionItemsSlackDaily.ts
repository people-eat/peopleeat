import type { ServerRuntime } from '../../domain/ServerRuntime';
import { adminActionItemsSlackMessageBuild } from '../../slack/adminActionItemsSlackMessage';
import { adminActionItemsSnapshot } from '../../slack/adminActionItemsSnapshot';
import { europeBerlinHour } from '../../utils/europeBerlinHour';
import type { RecurringJobDefinition } from '../types';

export { europeBerlinHour };

/**
 * Daily admin-home action-queue summary to the ops-alerts Slack channel.
 * Cron fires at 06:00 and 07:00 UTC; handler only posts when Berlin local hour is 8
 * so DST keeps the wall clock at 08:00 Europe/Berlin.
 */
export async function adminActionItemsSlackDailyRun(serverRuntime: ServerRuntime, options?: { now?: Date }): Promise<void> {
    const channelId = serverRuntime.slack.channels.opsAlerts;
    if (!channelId) {
        return;
    }

    const now = options?.now ?? new Date();
    if (europeBerlinHour(now) !== 8) {
        return;
    }

    const snapshot = await adminActionItemsSnapshot(serverRuntime, { now });
    const { text, blocks } = adminActionItemsSlackMessageBuild(snapshot);
    await serverRuntime.slack.postMessage({ channel: channelId, text, blocks });
}

export const adminActionItemsSlackDaily: RecurringJobDefinition = {
    kind: 'recurring',
    name: 'admin-action-items-slack-daily',
    // 06:00 UTC ≈ 08:00 CEST; 07:00 UTC ≈ 08:00 CET. Handler gates on Berlin hour.
    cron: '0 6,7 * * *',
    handler: async ({ serverRuntime }) => {
        await adminActionItemsSlackDailyRun(serverRuntime);
    },
    options: {
        retryLimit: 1,
        retryDelay: 60,
        expireInSeconds: 600,
    },
};
