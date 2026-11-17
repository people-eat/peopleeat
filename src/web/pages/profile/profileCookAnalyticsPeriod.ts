import { t } from '../../../i18n/t';
import {
    COOK_ANALYTICS_CHANNEL_DEFAULT,
    COOK_ANALYTICS_PERIOD_DEFAULT,
    cookAnalyticsChannelParse,
    cookAnalyticsChannels,
    cookAnalyticsPeriodParse,
    cookAnalyticsPeriods,
} from '../../../shared';
import type { CookAnalyticsChannel, CookAnalyticsPeriod } from '../../../shared';
import type { Locale } from '../../utils/locale';

export type ProfileCookAnalyticsSearch = {
    period?: CookAnalyticsPeriod;
    channel?: Exclude<CookAnalyticsChannel, 'ALL'>;
};

export function parseProfileCookAnalyticsSearch(search: Record<string, unknown>): ProfileCookAnalyticsSearch {
    const period = cookAnalyticsPeriodParse(search.period);
    const channel = cookAnalyticsChannelParse(search.channel);
    const next: ProfileCookAnalyticsSearch = {};
    if (period != null && period !== COOK_ANALYTICS_PERIOD_DEFAULT) {
        next.period = period;
    }
    if (channel === 'DIRECT' || channel === 'POOL') {
        next.channel = channel;
    }
    return next;
}

export function profileCookAnalyticsPeriodResolve(search: ProfileCookAnalyticsSearch): CookAnalyticsPeriod {
    return search.period ?? COOK_ANALYTICS_PERIOD_DEFAULT;
}

export function profileCookAnalyticsChannelResolve(search: ProfileCookAnalyticsSearch): CookAnalyticsChannel {
    return search.channel ?? COOK_ANALYTICS_CHANNEL_DEFAULT;
}

export function profileCookAnalyticsPageVariables(search: ProfileCookAnalyticsSearch = {}) {
    return {
        period: profileCookAnalyticsPeriodResolve(search),
        channel: profileCookAnalyticsChannelResolve(search),
    };
}

export function cookAnalyticsPeriodLabel(period: CookAnalyticsPeriod, locale: Locale): string {
    return t(locale, 'profileCook', `period.${period}`);
}

export function cookAnalyticsChannelLabel(channel: CookAnalyticsChannel, locale: Locale): string {
    return t(locale, 'profileCook', `analytics.channel.${channel}`);
}

export { cookAnalyticsChannels, cookAnalyticsPeriods };
