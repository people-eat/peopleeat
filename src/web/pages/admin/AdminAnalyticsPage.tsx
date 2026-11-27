import { Link, useNavigate } from '@tanstack/react-router';
import type { DateRange } from 'react-day-picker';

import { t } from '../../../i18n/t';
import { formatIsoDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { DateRangePicker } from '../../components/base/date-range-picker';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import type { GqlCAdminAnalyticsPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import type { Locale } from '../../utils/locale';
import { AdminAnalyticsBookingTab } from './AdminAnalyticsBookingTab';
import { AdminAnalyticsCooksTab } from './AdminAnalyticsCooksTab';
import { AdminAnalyticsGiftCardsTab } from './AdminAnalyticsGiftCardsTab';
import { ADMIN_ANALYTICS_TABS, adminAnalyticsSearchForUrl, adminAnalyticsTabResolve } from './adminAnalyticsSearch';
import type { AdminAnalyticsSearch, AdminAnalyticsTab } from './adminAnalyticsSearch';
import { AdminAnalyticsSignInTab } from './AdminAnalyticsSignInTab';
import { adminOverviewRangeResolve } from './adminOverviewRange';

const ANALYTICS_TAB_LABEL_KEY = {
    booking: 'analytics.tabs.booking',
    cooks: 'analytics.tabs.cooks',
    'sign-in': 'analytics.tabs.signIn',
    'gift-cards': 'analytics.tabs.giftCards',
} as const satisfies Record<
    AdminAnalyticsTab,
    'analytics.tabs.booking' | 'analytics.tabs.cooks' | 'analytics.tabs.signIn' | 'analytics.tabs.giftCards'
>;

export function adminAnalyticsPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'nav.analytics.title');
}
export function adminAnalyticsPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.analytics.description');
}

export function AdminAnalyticsPage({ data, search }: { data: GqlCAdminAnalyticsPageQuery; search: AdminAnalyticsSearch }) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/admin/analytics' });
    const range = adminOverviewRangeResolve(search);
    const tab = adminAnalyticsTabResolve(search);
    const admin = data.currentSession.user?.admin;

    const pickerValue: DateRange = {
        from: new Date(`${range.from}T00:00:00`),
        to: new Date(`${range.to}T00:00:00`),
    };

    function onRangeChange(next: DateRange | undefined) {
        if (!next?.from || !next.to) return;
        void navigate({
            search: adminAnalyticsSearchForUrl({
                from: formatIsoDate(next.from),
                to: formatIsoDate(next.to),
                tab: search.tab,
            }),
        });
    }

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-8">
                <h1 className="sr-only">{adminAnalyticsPageTitle(locale)}</h1>
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <Tabs value={tab}>
                        <TabsList variant="line" aria-label={t(locale, 'admin', 'analytics.tabs.aria')}>
                            {ADMIN_ANALYTICS_TABS.map((id) => (
                                <TabsTrigger key={id} value={id} asChild>
                                    <Link
                                        to="/{-$locale}/admin/analytics"
                                        search={adminAnalyticsSearchForUrl({
                                            from: range.from,
                                            to: range.to,
                                            tab: id,
                                        })}
                                        replace
                                    >
                                        {t(locale, 'admin', ANALYTICS_TAB_LABEL_KEY[id])}
                                    </Link>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                    <DateRangePicker
                        value={pickerValue}
                        onValueChange={onRangeChange}
                        locale={DATE_FNS_LOCALE[locale]}
                        placeholder={t(locale, 'admin', 'copy.pickADateRange')}
                        className="w-auto"
                        aria-label={t(locale, 'admin', 'copy.dateRangeForAnalytics')}
                    />
                </div>

                {admin && tab === 'booking' ? <AdminAnalyticsBookingTab admin={admin} range={range} /> : null}
                {admin && tab === 'cooks' ? <AdminAnalyticsCooksTab admin={admin} range={range} /> : null}
                {admin && tab === 'sign-in' ? <AdminAnalyticsSignInTab admin={admin} range={range} /> : null}
                {admin && tab === 'gift-cards' ? <AdminAnalyticsGiftCardsTab admin={admin} range={range} /> : null}
            </main>
        </AdminPathPageChrome>
    );
}
