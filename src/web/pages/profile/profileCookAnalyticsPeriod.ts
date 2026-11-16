import { t } from '../../../i18n/t';
import { COOK_ANALYTICS_PERIOD_DEFAULT, cookAnalyticsPeriodParse, cookAnalyticsPeriods } from '../../../shared';
import type { CookAnalyticsPeriod } from '../../../shared';
import type { Locale } from '../../utils/locale';

export type ProfileCookAnalyticsSearch = {
    period?: CookAnalyticsPeriod;
};

export function parseProfileCookAnalyticsSearch(search: Record<string, unknown>): ProfileCookAnalyticsSearch {
    const period = cookAnalyticsPeriodParse(search.period);
    return period == null || period === COOK_ANALYTICS_PERIOD_DEFAULT ? {} : { period };
}

export function profileCookAnalyticsPeriodResolve(search: ProfileCookAnalyticsSearch): CookAnalyticsPeriod {
    return search.period ?? COOK_ANALYTICS_PERIOD_DEFAULT;
}

export function profileCookAnalyticsPageVariables(search: ProfileCookAnalyticsSearch = {}) {
    return { period: profileCookAnalyticsPeriodResolve(search) };
}

export function cookAnalyticsPeriodLabel(period: CookAnalyticsPeriod, locale: Locale): string {
    return t(locale, 'profileCook', `period.${period}`);
}

export { cookAnalyticsPeriods };
