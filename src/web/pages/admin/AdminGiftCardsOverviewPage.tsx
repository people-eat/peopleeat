import { useNavigate } from '@tanstack/react-router';
import { GiftIcon, ListIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { t } from '../../../i18n/t';
import { formatCurrency, formatIsoDate, formatMonthYear } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { DateRangePicker } from '../../components/base/date-range-picker';
import type { GqlCAdminGiftCardCriterion, GqlCAdminGiftCardsOverviewPageQuery, GqlCGiftCardPaymentStatus } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import type { Locale } from '../../utils/locale';
import { adminAnalyticsSearchForRange } from './adminAnalyticsSearch';
import { adminGiftCardOccasionLabel, adminGiftCardsSectionTo } from './adminGiftCards';
import { adminGiftCardPaymentStatusLabel } from './adminGiftCardsColumns';
import { AdminOverviewBarChart } from './AdminOverviewBarChart';
import { adminOverviewLinkCardClassName } from './adminOverviewLinkCard';
import { AdminOverviewNavCard } from './AdminOverviewNavCard';
import { adminOverviewRangeResolve, adminOverviewRangeToGraphQlVariables } from './adminOverviewRange';
import type { AdminOverviewRangeSearch } from './adminOverviewRange';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';
import { AdminRelatedPageLinks } from './AdminRelatedPageLink';

export function adminGiftCardsOverviewPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'nav.giftCards.title');
}
export function adminGiftCardsOverviewPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.giftCardsOverview.description');
}

/** Order matches `giftCardsCounts` indices on the overview query. */
const ADMIN_GIFT_CARD_COUNT_CRITERIA: GqlCAdminGiftCardCriterion[] = [
    { paymentStatuses: ['PREPARED', 'PAYED'] },
    { paymentStatuses: ['PAYED'] },
    { paymentStatuses: ['PREPARED'] },
];

const ADMIN_GIFT_CARD_RANKING_TAKE = 3;

export function adminGiftCardsOverviewPageVariables(search: AdminOverviewRangeSearch = {}) {
    return {
        criteria: ADMIN_GIFT_CARD_COUNT_CRITERIA,
        ...adminOverviewRangeToGraphQlVariables(adminOverviewRangeResolve(search)),
        occasionStatsTake: ADMIN_GIFT_CARD_RANKING_TAKE,
        salesMonthStatsTake: ADMIN_GIFT_CARD_RANKING_TAKE,
    };
}

function adminGiftCardsListSearch(status: GqlCGiftCardPaymentStatus | undefined) {
    return {
        q: undefined,
        status,
        page: undefined,
        sort: undefined,
        dir: undefined,
    };
}

export function AdminGiftCardsOverviewPage({
    data,
    search,
}: {
    data: GqlCAdminGiftCardsOverviewPageQuery;
    search: AdminOverviewRangeSearch;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/admin/gift-cards' });
    const range = adminOverviewRangeResolve(search);
    const admin = data.currentSession.user?.admin;
    const [total = 0, payed = 0, prepared = 0] = admin?.giftCardsCounts ?? [];
    const buckets = admin?.giftCardCreations ?? [];
    const occasionStats = admin?.giftCardOccasionStats ?? [];
    const salesMonthStats = admin?.giftCardSalesMonthStats ?? [];
    const averageCents = admin?.giftCardPaidPurchaseAverageCents ?? 0;
    const rangePaidCents = admin?.giftCardPaidPurchaseRangeCents ?? 0;

    const distribution: {
        key: 'total' | 'payed' | 'prepared';
        label: string;
        value: number;
        status: GqlCGiftCardPaymentStatus | undefined;
    }[] = [
        {
            key: 'total',
            label: t(locale, 'admin', 'copy.total'),
            value: total,
            status: undefined,
        },
        {
            key: 'payed',
            label: adminGiftCardPaymentStatusLabel('PAYED', locale),
            value: payed,
            status: 'PAYED',
        },
        {
            key: 'prepared',
            label: adminGiftCardPaymentStatusLabel('PREPARED', locale),
            value: prepared,
            status: 'PREPARED',
        },
    ];

    const pickerValue: DateRange = {
        from: new Date(`${range.from}T00:00:00`),
        to: new Date(`${range.to}T00:00:00`),
    };

    function onRangeChange(next: DateRange | undefined) {
        if (!next?.from || !next.to) return;
        void navigate({
            search: {
                from: formatIsoDate(next.from),
                to: formatIsoDate(next.to),
            },
        });
    }

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="mx-auto grid w-full max-w-5xl content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="flex items-center gap-3 font-serif text-4xl/tight text-foreground">
                        <GiftIcon className="size-8 text-muted-foreground" aria-hidden />
                        {adminGiftCardsOverviewPageTitle(locale)}
                    </h1>
                    <p className="text-muted-foreground">{adminGiftCardsOverviewPageDescription(locale)}</p>
                </div>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.sections')}</h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        <li>
                            <AdminOverviewNavCard
                                to={adminGiftCardsSectionTo('list')}
                                search={adminGiftCardsListSearch(undefined)}
                                icon={ListIcon}
                            >
                                {t(locale, 'admin', 'copy.list')}
                            </AdminOverviewNavCard>
                        </li>
                    </ul>
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.distribution')}</h2>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {distribution.map((entry) => (
                            <AdminOverviewStatCard
                                key={entry.key}
                                label={entry.label}
                                value={entry.value}
                                to={adminGiftCardsSectionTo('list')}
                                search={adminGiftCardsListSearch(entry.status)}
                            />
                        ))}
                        <AdminOverviewStatCard
                            label={t(locale, 'admin', 'copy.avgPurchase')}
                            value={averageCents}
                            displayValue={formatCurrency(averageCents, { locale, maximumFractionDigits: 0 })}
                        />
                    </dl>
                </section>

                <section className="grid gap-3">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.purchases')}</h2>
                        <div className="flex flex-wrap items-end gap-2">
                            <AdminRelatedPageLinks
                                links={[
                                    {
                                        to: '/{-$locale}/admin/analytics',
                                        search: adminAnalyticsSearchForRange(range, 'gift-cards'),
                                        label: t(locale, 'admin', 'traffic.viewAnalytics'),
                                    },
                                ]}
                            />
                            <DateRangePicker
                                value={pickerValue}
                                onValueChange={onRangeChange}
                                locale={DATE_FNS_LOCALE[locale]}
                                placeholder={t(locale, 'admin', 'copy.pickADateRange')}
                                className="w-auto"
                                aria-label={t(locale, 'admin', 'copy.dateRangeForGiftCardPurchases')}
                            />
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'analytics.giftCards.paidChartCaption')}</p>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <AdminOverviewStatCard
                            label={t(locale, 'admin', 'analytics.giftCards.paidInRange')}
                            value={rangePaidCents}
                            displayValue={formatCurrency(rangePaidCents, { locale, maximumFractionDigits: 0 })}
                        />
                    </dl>
                    <AdminOverviewBarChart
                        data={buckets.map((bucket) => ({ bucketStart: bucket.bucketStart, count: bucket.count }))}
                        locale={locale}
                        timeZone={timeZone}
                        ariaLabel={t(locale, 'admin', 'copy.barChartOfPaidGiftCardPurchasesInTheSelectedRange')}
                    />
                </section>

                <section className="grid gap-3">
                    <p className="text-sm text-muted-foreground">
                        {t(locale, 'admin', 'copy.top3AcrossAllPaidPurchasesIndependentOfTheChartRange')}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 sm:items-start">
                        <div className="grid gap-3">
                            <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.top3Occasions')}</h2>
                            {occasionStats.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noPaidPurchases')}</p>
                            ) : (
                                <ul className="grid gap-2">
                                    {occasionStats.map((stat) => (
                                        <li key={stat.occasion}>
                                            <div
                                                className={adminOverviewLinkCardClassName(
                                                    'flex flex-wrap items-center justify-between gap-3 px-4 py-3',
                                                )}
                                            >
                                                <span className="font-medium text-foreground">
                                                    {adminGiftCardOccasionLabel(stat.occasion, locale)}
                                                </span>
                                                <span className="text-sm text-muted-foreground tabular-nums">
                                                    {`${stat.count} · ${formatCurrency(stat.totalOriginalBalanceCents, { locale, maximumFractionDigits: 0 })}`}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="grid gap-3">
                            <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.top3SalesMonths')}</h2>
                            {salesMonthStats.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noPaidPurchases')}</p>
                            ) : (
                                <ul className="grid gap-2">
                                    {salesMonthStats.map((stat) => (
                                        <li key={String(stat.monthStart)}>
                                            <div
                                                className={adminOverviewLinkCardClassName(
                                                    'flex flex-wrap items-center justify-between gap-3 px-4 py-3',
                                                )}
                                            >
                                                <span className="font-medium text-foreground">
                                                    {formatMonthYear(stat.monthStart, { locale, timeZone, month: 'long' })}
                                                </span>
                                                <span className="text-sm text-muted-foreground tabular-nums">
                                                    {`${stat.count} · ${formatCurrency(stat.totalOriginalBalanceCents, { locale, maximumFractionDigits: 0 })}`}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </section>
            </main>
        </AdminPathPageChrome>
    );
}
