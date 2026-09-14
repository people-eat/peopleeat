import { formatDateTime } from '../../shared/formatDate';
import type { ResendEmailQuotaRisk } from '../utils/resendEmailQuotaAtRisk';
import { slackAdminOutboundEmailsUrl } from './slackAdminUrls';
import { slackMessageBlocksBuild } from './slackBlocks';
import { slackShortId } from './slackFormat';

const SLACK_TIME_ZONE = 'Europe/Berlin';

type QuotaWindow = {
    used: number;
    limit: number | null;
    sent: number;
    received: number;
    resetsAt: Date;
};

export type ResendUsageSlackMessageInput = {
    monthly: QuotaWindow;
    daily: QuotaWindow;
    monthlyRisk: ResendEmailQuotaRisk;
    dailyRisk: ResendEmailQuotaRisk;
    now: Date;
};

function formatPercent(ratio: number | null): string {
    if (ratio == null || !Number.isFinite(ratio)) return 'n/a';
    return `${Math.round(ratio * 100)}%`;
}

function quotaLines(label: string, quota: QuotaWindow, risk: ResendEmailQuotaRisk): string[] {
    if (quota.limit == null) {
        return [`*${label}:* ${quota.used} gesendet (kein Limit)`];
    }
    const lines = [
        `*${label}:* ${quota.used} / ${quota.limit} (${formatPercent(risk.ratio)})`,
        `Reset: ${formatDateTime(quota.resetsAt, { locale: 'de', timeZone: SLACK_TIME_ZONE, dateStyle: 'medium', timeStyle: 'short' })}`,
    ];
    if (risk.projected != null && Number.isFinite(risk.projected)) {
        lines.push(`Prognose bis Reset: ~${Math.round(risk.projected)}`);
    }
    return lines;
}

/**
 * German Block Kit alert when Resend email quota is at risk.
 */
export function resendUsageSlackMessageBuild(input: ResendUsageSlackMessageInput): {
    text: string;
    blocks: ReturnType<typeof slackMessageBlocksBuild>['blocks'];
} {
    const sections: string[] = [];
    if (input.monthlyRisk.atRisk) {
        sections.push(quotaLines('Monatskontingent', input.monthly, input.monthlyRisk).join('\n'));
    }
    if (input.dailyRisk.atRisk) {
        sections.push(quotaLines('Tageskontingent', input.daily, input.dailyRisk).join('\n'));
    }

    return slackMessageBlocksBuild({
        header: 'Resend E-Mail-Kontingent gefährdet',
        body: sections.join('\n\n'),
        contextLines: [`Alert ${slackShortId(input.now.toISOString())}`],
        adminHref: slackAdminOutboundEmailsUrl(),
        adminButtonTitle: 'E-Mail-Übersicht öffnen',
    });
}
