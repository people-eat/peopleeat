import { Link, useNavigate } from '@tanstack/react-router';
import { FileInputIcon, ListIcon, PlusIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { t } from '../../../i18n/t';
import { formatCurrency, formatIsoDate, formatMonthYear } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { DateRangePicker } from '../../components/base/date-range-picker';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import type {
    GqlCAdminBookingRequestCriterion,
    GqlCAdminBookingRequestDateBasis,
    GqlCAdminBookingRequestsOverviewPageQuery,
    GqlCBookingRequestPublicationStatus,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import type { Locale } from '../../utils/locale';
import { adminAnalyticsSearchForRange } from './adminAnalyticsSearch';
import { adminBookingRequestsSectionTo } from './adminBookingRequests';
import { adminBookingRequestPublicationStatusLabel } from './adminBookingRequestsColumns';
import {
    adminBookingRequestsOverviewDateBasisResolve,
    adminBookingRequestsOverviewSearchForNavigate,
} from './adminBookingRequestsOverviewSearch';
import type { AdminBookingRequestsOverviewSearch } from './adminBookingRequestsOverviewSearch';
import { AdminOverviewBarChart } from './AdminOverviewBarChart';
import { adminOverviewLinkCardClassName } from './adminOverviewLinkCard';
import { AdminOverviewNavCard } from './AdminOverviewNavCard';
import { adminOverviewRangeResolve, adminOverviewRangeToGraphQlVariables } from './adminOverviewRange';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';
import { AdminRelatedPageLinks } from './AdminRelatedPageLink';

export function adminBookingRequestsOverviewPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'nav.bookingRequests.title');
}
export function adminBookingRequestsOverviewPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.bookingRequestsOverview.description');
}

/** Order matches `bookingRequestsCounts` indices on the overview query. */
const ADMIN_BOOKING_REQUEST_COUNT_CRITERIA: GqlCAdminBookingRequestCriterion[] = [
    {},
    { publicationStatuses: ['PUBLICATION_BLOCKED_BY_ADMIN_REVIEW'] },
    { publicationStatuses: ['PUBLICATION_AUTO_APPROVED'] },
    { publicationStatuses: ['PUBLICATION_APPROVED_BY_ADMIN'] },
    { publicationStatuses: ['PUBLICATION_DIRECT_TO_COOK'] },
];

const ADMIN_BOOKING_REQUEST_RANKING_TAKE = 5;

const ADMIN_BOOKING_REQUEST_DATE_BASIS_OPTIONS: GqlCAdminBookingRequestDateBasis[] = ['createdAt', 'dateTime'];

export function adminBookingRequestsOverviewPageVariables(search: AdminBookingRequestsOverviewSearch = {}) {
    const dateBasis = adminBookingRequestsOverviewDateBasisResolve(search);
    return {
        criteria: ADMIN_BOOKING_REQUEST_COUNT_CRITERIA,
        ...adminOverviewRangeToGraphQlVariables(adminOverviewRangeResolve(search)),
        dateBasis,
        occasionStatsTake: ADMIN_BOOKING_REQUEST_RANKING_TAKE,
        creationMonthStatsTake: ADMIN_BOOKING_REQUEST_RANKING_TAKE,
        cookOfferStatsTake: ADMIN_BOOKING_REQUEST_RANKING_TAKE,
    };
}

function adminBookingRequestsListSearch(publicationStatus: GqlCBookingRequestPublicationStatus | undefined) {
    return {
        q: undefined,
        publicationStatus,
        status: undefined,
        page: undefined,
        sort: undefined,
        dir: undefined,
        view: undefined,
    };
}

function participantsLabel(count: number, locale: Locale): string {
    return t(locale, 'admin', 'bookingRequests.guestCount', { count });
}

function formatAverageOffers(value: number, locale: Locale): string {
    return value.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
    });
}

function formatConversionRatePercent(rate: number | null | undefined, locale: Locale): string {
    if (rate == null || !Number.isFinite(rate)) {
        return t(locale, 'admin', 'pages.bookingRequestsOverview.conversion.na');
    }
    return `${Math.round(rate * 100)}\u00a0%`;
}

function dateBasisLabel(dateBasis: GqlCAdminBookingRequestDateBasis, locale: Locale): string {
    return dateBasis === 'dateTime'
        ? t(locale, 'admin', 'pages.bookingRequestsOverview.conversion.dateTime')
        : t(locale, 'admin', 'pages.bookingRequestsOverview.conversion.createdAt');
}

export function AdminBookingRequestsOverviewPage({
    data,
    search,
}: {
    data: GqlCAdminBookingRequestsOverviewPageQuery;
    search: AdminBookingRequestsOverviewSearch;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/admin/booking-requests' });
    const range = adminOverviewRangeResolve(search);
    const dateBasis = adminBookingRequestsOverviewDateBasisResolve(search);
    const admin = data.currentSession.user?.admin;
    const [total = 0, blocked = 0, autoApproved = 0, adminApproved = 0, directToCook = 0] = admin?.bookingRequestsCounts ?? [];
    const buckets = admin?.bookingRequestCreations ?? [];
    const occasionStats = admin?.bookingRequestOccasionStats ?? [];
    const creationMonthStats = admin?.bookingRequestCreationMonthStats ?? [];
    const averageParticipants = admin?.bookingRequestAverageParticipants ?? 0;
    const economics = admin?.bookingRequestOfferEconomics;
    const conversionRate = admin?.bookingRequestConversionRate;
    const conversionMonthStats = admin?.bookingRequestConversionMonthStats ?? [];
    const cooksByOffers = admin?.cooksByOffers ?? [];
    const cooksByConversions = admin?.cooksByConversions ?? [];

    const distribution: {
        key: string;
        label: string;
        value: number;
        publicationStatus: GqlCBookingRequestPublicationStatus | undefined;
    }[] = [
        {
            key: 'total',
            label: t(locale, 'admin', 'copy.total'),
            value: total,
            publicationStatus: undefined,
        },
        {
            key: 'blocked',
            label: adminBookingRequestPublicationStatusLabel('PUBLICATION_BLOCKED_BY_ADMIN_REVIEW', locale),
            value: blocked,
            publicationStatus: 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW',
        },
        {
            key: 'auto',
            label: adminBookingRequestPublicationStatusLabel('PUBLICATION_AUTO_APPROVED', locale),
            value: autoApproved,
            publicationStatus: 'PUBLICATION_AUTO_APPROVED',
        },
        {
            key: 'admin',
            label: adminBookingRequestPublicationStatusLabel('PUBLICATION_APPROVED_BY_ADMIN', locale),
            value: adminApproved,
            publicationStatus: 'PUBLICATION_APPROVED_BY_ADMIN',
        },
        {
            key: 'direct',
            label: adminBookingRequestPublicationStatusLabel('PUBLICATION_DIRECT_TO_COOK', locale),
            value: directToCook,
            publicationStatus: 'PUBLICATION_DIRECT_TO_COOK',
        },
    ];

    const pickerValue: DateRange = {
        from: new Date(`${range.from}T00:00:00`),
        to: new Date(`${range.to}T00:00:00`),
    };

    function navigateOverviewSearch(next: { from: string; to: string; dateBasis: GqlCAdminBookingRequestDateBasis }) {
        void navigate({
            search: adminBookingRequestsOverviewSearchForNavigate(next),
        });
    }

    function onRangeChange(next: DateRange | undefined) {
        if (!next?.from || !next.to) return;
        navigateOverviewSearch({
            from: formatIsoDate(next.from),
            to: formatIsoDate(next.to),
            dateBasis,
        });
    }

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="mx-auto grid w-full max-w-5xl content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="flex items-center gap-3 font-serif text-4xl/tight text-foreground">
                        <FileInputIcon className="size-8 text-muted-foreground" aria-hidden />
                        {adminBookingRequestsOverviewPageTitle(locale)}
                    </h1>
                    <p className="text-muted-foreground">{adminBookingRequestsOverviewPageDescription(locale)}</p>
                </div>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.sections')}</h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        <li>
                            <AdminOverviewNavCard
                                to={adminBookingRequestsSectionTo('list')}
                                search={adminBookingRequestsListSearch(undefined)}
                                icon={ListIcon}
                            >
                                {t(locale, 'admin', 'copy.list')}
                            </AdminOverviewNavCard>
                        </li>
                        <li>
                            <AdminOverviewNavCard to={adminBookingRequestsSectionTo('create')} icon={PlusIcon}>
                                {t(locale, 'admin', 'copy.create')}
                            </AdminOverviewNavCard>
                        </li>
                    </ul>
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.distribution')}</h2>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {distribution.map((entry) => (
                            <AdminOverviewStatCard
                                key={entry.key}
                                label={entry.label}
                                value={entry.value}
                                to={adminBookingRequestsSectionTo('list')}
                                search={adminBookingRequestsListSearch(entry.publicationStatus)}
                            />
                        ))}
                        <AdminOverviewStatCard
                            label={t(locale, 'admin', 'copy.avgGuests')}
                            value={averageParticipants}
                            displayValue={String(averageParticipants)}
                        />
                    </dl>
                </section>

                <section className="grid gap-3">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.receivedBookingRequests')}</h2>
                        <div className="flex flex-wrap items-end gap-2">
                            <AdminRelatedPageLinks
                                links={[
                                    {
                                        to: '/{-$locale}/admin/analytics',
                                        search: adminAnalyticsSearchForRange(range, 'booking'),
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
                                aria-label={t(locale, 'admin', 'copy.dateRangeForReceivedBookingRequestsAndRevenue')}
                            />
                        </div>
                    </div>
                    <AdminOverviewBarChart
                        data={buckets.map((bucket) => ({ bucketStart: bucket.bucketStart, count: bucket.count }))}
                        locale={locale}
                        timeZone={timeZone}
                        ariaLabel={t(locale, 'admin', 'copy.barChartOfReceivedBookingRequestsInTheSelectedRange')}
                    />
                </section>

                <section className="grid gap-3">
                    <div className="grid gap-1">
                        <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.offersRevenue')}</h2>
                        <p className="text-sm text-muted-foreground">
                            {t(locale, 'admin', 'copy.averagesAndTotalsAcrossAllPaidOffersRangeTotalsFollowTheChar')}
                        </p>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <AdminOverviewStatCard
                            label={t(locale, 'admin', 'copy.avgOffers')}
                            value={economics?.averageOffersPerRequest ?? 0}
                            displayValue={formatAverageOffers(economics?.averageOffersPerRequest ?? 0, locale)}
                        />
                        <AdminOverviewStatCard
                            label={t(locale, 'admin', 'copy.avgOfferPrice')}
                            value={economics?.averageMenuPriceCents ?? 0}
                            displayValue={formatCurrency(economics?.averageMenuPriceCents ?? 0, {
                                locale,
                                maximumFractionDigits: 0,
                            })}
                        />
                        <AdminOverviewStatCard
                            label={t(locale, 'admin', 'copy.avgRevenue')}
                            value={economics?.averagePaidCustomerTotalCents ?? 0}
                            displayValue={formatCurrency(economics?.averagePaidCustomerTotalCents ?? 0, {
                                locale,
                                maximumFractionDigits: 0,
                            })}
                        />
                        <AdminOverviewStatCard
                            label={t(locale, 'admin', 'copy.avgPlatformFee')}
                            value={economics?.averagePaidPlatformRevenueCents ?? 0}
                            displayValue={formatCurrency(economics?.averagePaidPlatformRevenueCents ?? 0, {
                                locale,
                                maximumFractionDigits: 0,
                            })}
                        />
                    </dl>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <AdminOverviewStatCard
                            label={t(locale, 'admin', 'copy.totalRevenue')}
                            value={economics?.totalPaidCustomerTotalCents ?? 0}
                            displayValue={formatCurrency(economics?.totalPaidCustomerTotalCents ?? 0, {
                                locale,
                                maximumFractionDigits: 0,
                            })}
                        />
                        <AdminOverviewStatCard
                            label={t(locale, 'admin', 'copy.totalPlatformProfit')}
                            value={economics?.totalPaidPlatformRevenueCents ?? 0}
                            displayValue={formatCurrency(economics?.totalPaidPlatformRevenueCents ?? 0, {
                                locale,
                                maximumFractionDigits: 0,
                            })}
                        />
                        <AdminOverviewStatCard
                            label={t(locale, 'admin', 'copy.revenueInRange')}
                            value={economics?.rangeTotalPaidCustomerTotalCents ?? 0}
                            displayValue={formatCurrency(economics?.rangeTotalPaidCustomerTotalCents ?? 0, {
                                locale,
                                maximumFractionDigits: 0,
                            })}
                        />
                        <AdminOverviewStatCard
                            label={t(locale, 'admin', 'copy.platformProfitInRange')}
                            value={economics?.rangeTotalPaidPlatformRevenueCents ?? 0}
                            displayValue={formatCurrency(economics?.rangeTotalPaidPlatformRevenueCents ?? 0, {
                                locale,
                                maximumFractionDigits: 0,
                            })}
                        />
                    </dl>
                </section>

                <section className="grid gap-3">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="grid gap-1">
                            <h2 className="text-lg font-medium">{t(locale, 'admin', 'pages.bookingRequestsOverview.conversion.title')}</h2>
                            <p className="text-sm text-muted-foreground">
                                {t(locale, 'admin', 'pages.bookingRequestsOverview.conversion.description')}
                            </p>
                        </div>
                        <Tabs
                            value={dateBasis}
                            onValueChange={(value) => {
                                navigateOverviewSearch({
                                    from: range.from,
                                    to: range.to,
                                    dateBasis: value as GqlCAdminBookingRequestDateBasis,
                                });
                            }}
                        >
                            <TabsList
                                variant="line"
                                aria-label={t(locale, 'admin', 'pages.bookingRequestsOverview.conversion.dateBasisLabel')}
                            >
                                {ADMIN_BOOKING_REQUEST_DATE_BASIS_OPTIONS.map((option) => (
                                    <TabsTrigger key={option} value={option}>
                                        {dateBasisLabel(option, locale)}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <AdminOverviewStatCard
                            label={t(locale, 'admin', 'pages.bookingRequestsOverview.conversion.avgRate')}
                            value={conversionRate?.rate == null ? 0 : Math.round(conversionRate.rate * 100)}
                            displayValue={formatConversionRatePercent(conversionRate?.rate, locale)}
                        />
                    </dl>
                    <AdminOverviewBarChart
                        data={conversionMonthStats.map((bucket) => ({
                            bucketStart: bucket.monthStart,
                            ratePercent: Math.round(bucket.rate * 100),
                        }))}
                        locale={locale}
                        timeZone={timeZone}
                        bucketLabel="monthYear"
                        series={[
                            {
                                dataKey: 'ratePercent',
                                label: t(locale, 'admin', 'pages.bookingRequestsOverview.conversion.rateSeries'),
                                color: 'var(--foreground)',
                            },
                        ]}
                        ariaLabel={t(locale, 'admin', 'pages.bookingRequestsOverview.conversion.chartAriaLabel')}
                    />
                </section>

                <section className="grid gap-3">
                    <p className="text-sm text-muted-foreground">
                        {t(locale, 'admin', 'copy.top5AcrossAllRequestsIndependentOfTheChartRange')}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 sm:items-start">
                        <div className="grid gap-3">
                            <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.top5Occasions')}</h2>
                            {occasionStats.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noRequests')}</p>
                            ) : (
                                <ul className="grid gap-2">
                                    {occasionStats.map((stat) => (
                                        <li key={stat.occasion}>
                                            <div
                                                className={adminOverviewLinkCardClassName(
                                                    'flex flex-wrap items-center justify-between gap-3 px-4 py-3',
                                                )}
                                            >
                                                <span className="font-medium text-foreground">{stat.occasion}</span>
                                                <span className="text-sm text-muted-foreground tabular-nums">
                                                    {`${stat.count} · ${participantsLabel(stat.totalParticipants, locale)}`}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="grid gap-3">
                            <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.top5Months')}</h2>
                            {creationMonthStats.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noRequests')}</p>
                            ) : (
                                <ul className="grid gap-2">
                                    {creationMonthStats.map((stat) => (
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
                                                    {`${stat.count} · ${participantsLabel(stat.totalParticipants, locale)}`}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </section>

                <section className="grid gap-3">
                    <p className="text-sm text-muted-foreground">
                        {t(locale, 'admin', 'copy.top5CooksAcrossAllOffersIndependentOfTheChartRange')}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 sm:items-start">
                        <div className="grid gap-3">
                            <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.mostOffers')}</h2>
                            {cooksByOffers.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noOffers2')}</p>
                            ) : (
                                <ul className="grid gap-2">
                                    {cooksByOffers.map((stat) => (
                                        <li key={stat.cookId}>
                                            <Link
                                                to="/{-$locale}/admin/users/$userId"
                                                params={{ userId: stat.cookId }}
                                                className={adminOverviewLinkCardClassName(
                                                    'flex flex-wrap items-center justify-between gap-3 px-4 py-3',
                                                )}
                                            >
                                                <span className="font-medium text-foreground">{stat.displayName}</span>
                                                <span className="text-sm text-muted-foreground tabular-nums">
                                                    {t(locale, 'admin', 'bookingRequests.offersAndAccepts', {
                                                        offerCount: stat.offerCount,
                                                        conversionCount: stat.conversionCount,
                                                    })}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="grid gap-3">
                            <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.mostConversions')}</h2>
                            {cooksByConversions.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noConversions')}</p>
                            ) : (
                                <ul className="grid gap-2">
                                    {cooksByConversions.map((stat) => (
                                        <li key={stat.cookId}>
                                            <Link
                                                to="/{-$locale}/admin/users/$userId"
                                                params={{ userId: stat.cookId }}
                                                className={adminOverviewLinkCardClassName(
                                                    'flex flex-wrap items-center justify-between gap-3 px-4 py-3',
                                                )}
                                            >
                                                <span className="font-medium text-foreground">{stat.displayName}</span>
                                                <span className="text-sm text-muted-foreground tabular-nums">
                                                    {t(locale, 'admin', 'bookingRequests.acceptsAndOffers', {
                                                        conversionCount: stat.conversionCount,
                                                        offerCount: stat.offerCount,
                                                    })}
                                                </span>
                                            </Link>
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
