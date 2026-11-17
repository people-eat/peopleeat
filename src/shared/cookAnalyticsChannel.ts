export const cookAnalyticsChannels = ['ALL', 'DIRECT', 'POOL'] as const;
export type CookAnalyticsChannel = (typeof cookAnalyticsChannels)[number];

export const COOK_ANALYTICS_CHANNEL_DEFAULT: CookAnalyticsChannel = 'ALL';

/** Lead channels that appear as funnel columns (excludes ALL). */
export const cookAnalyticsFunnelChannels = ['DIRECT', 'POOL'] as const;
export type CookAnalyticsFunnelChannel = (typeof cookAnalyticsFunnelChannels)[number];

export function cookAnalyticsChannelParse(value: unknown): CookAnalyticsChannel | undefined {
    if (typeof value !== 'string') return undefined;
    return cookAnalyticsChannels.includes(value as CookAnalyticsChannel) ? (value as CookAnalyticsChannel) : undefined;
}
