import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

import { t } from '../../../i18n/t';
import type { CookAnalyticsChannel, CookAnalyticsPeriod } from '../../../shared';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { StatusAlert } from '../../components/base/status-alert';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import type { GqlCProfileCookAnalyticsPageQuery } from '../../graphql/generated';
import { useFeatureToggleActive } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import {
    CookAnalyticsCatalog,
    CookAnalyticsChefPage,
    CookAnalyticsFunnelPair,
    CookAnalyticsHero,
    CookAnalyticsInsights,
} from './CookAnalyticsSections';
import { cookNavRouteBySlug } from './cookCatalog';
import {
    cookAnalyticsChannelLabel,
    cookAnalyticsChannels,
    cookAnalyticsPeriodLabel,
    cookAnalyticsPeriods,
    parseProfileCookAnalyticsSearch,
    profileCookAnalyticsChannelResolve,
    profileCookAnalyticsPeriodResolve,
} from './profileCookAnalyticsPeriod';
import type { ProfileCookAnalyticsSearch } from './profileCookAnalyticsPeriod';

const route = cookNavRouteBySlug('analytics');
export const profileCookAnalyticsPageTitle = route.title;
export const profileCookAnalyticsPageDescription = route.description;

export { parseProfileCookAnalyticsSearch };

export function ProfileCookAnalyticsPage({
    data,
    search,
}: {
    data: GqlCProfileCookAnalyticsPageQuery;
    search: ProfileCookAnalyticsSearch;
}) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/profile/analytics' });
    const analyticsEnabled = useFeatureToggleActive('COOK_ANALYTICS');
    const period = profileCookAnalyticsPeriodResolve(search);
    const channel = profileCookAnalyticsChannelResolve(search);
    const analytics = data.currentSession.user?.cook?.analytics ?? null;

    useEffect(() => {
        if (!analyticsEnabled || analytics == null) {
            void navigate({ to: '/{-$locale}/profile', replace: true });
        }
    }, [analytics, analyticsEnabled, navigate]);

    if (!analyticsEnabled || analytics == null) {
        return null;
    }

    function navigateSearch(next: { period: CookAnalyticsPeriod; channel: CookAnalyticsChannel }) {
        const nextSearch: ProfileCookAnalyticsSearch = {};
        if (next.period !== 'PAST_MONTH') nextSearch.period = next.period;
        if (next.channel !== 'ALL') nextSearch.channel = next.channel;
        void navigate({
            search: nextSearch,
            replace: true,
        });
    }

    return (
        <main id="main-content" className="mx-auto grid w-full max-w-5xl content-start gap-8">
            <div className="grid gap-2">
                <h1 className="font-serif text-2xl/tight text-foreground">{profileCookAnalyticsPageTitle(locale)}</h1>
                <p className="text-muted-foreground">{profileCookAnalyticsPageDescription(locale)}</p>
            </div>

            {!analytics.hasInsights ? (
                <StatusAlert tone="info" title={t(locale, 'profileCook', 'analytics.emptyTitle')}>
                    {t(locale, 'profileCook', 'analytics.emptyBody')}
                </StatusAlert>
            ) : (
                <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Tabs
                            value={period}
                            onValueChange={(value) => {
                                navigateSearch({
                                    period: profileCookAnalyticsPeriodResolve({
                                        period: value as ProfileCookAnalyticsSearch['period'],
                                    }),
                                    channel,
                                });
                            }}
                        >
                            <TabsList variant="line" aria-label={t(locale, 'profileCook', 'period.label')}>
                                {cookAnalyticsPeriods.map((entry) => (
                                    <TabsTrigger key={entry} value={entry}>
                                        {cookAnalyticsPeriodLabel(entry, locale)}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>

                        <Select
                            value={channel}
                            onValueChange={(value) => {
                                navigateSearch({
                                    period,
                                    channel: profileCookAnalyticsChannelResolve({
                                        channel: value === 'ALL' ? undefined : (value as ProfileCookAnalyticsSearch['channel']),
                                    }),
                                });
                            }}
                        >
                            <SelectTrigger
                                size="sm"
                                className="w-auto shrink-0"
                                aria-label={t(locale, 'profileCook', 'analytics.channel.label')}
                            >
                                <SelectValue>{cookAnalyticsChannelLabel(channel, locale)}</SelectValue>
                            </SelectTrigger>
                            <SelectContent align="end">
                                {cookAnalyticsChannels.map((entry) => (
                                    <SelectItem key={entry} value={entry}>
                                        {cookAnalyticsChannelLabel(entry, locale)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-10">
                        <CookAnalyticsHero analytics={analytics} />
                        <CookAnalyticsInsights analytics={analytics} />
                        <CookAnalyticsCatalog analytics={analytics} />
                        <CookAnalyticsChefPage analytics={analytics} />
                        <CookAnalyticsFunnelPair funnels={analytics.funnels} channel={channel} analytics={analytics} />
                    </div>
                </>
            )}
        </main>
    );
}
