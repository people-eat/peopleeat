import { useNavigate } from '@tanstack/react-router';
import { GiftIcon, ListIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { formatCurrency, formatIsoDate, formatMonthYear } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { DateRangePicker } from '../../components/base/date-range-picker';
import type { GqlCAdminGiftCardCriterion, GqlCAdminGiftCardsOverviewPageQuery, GqlCGiftCardPaymentStatus } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import { adminGiftCardOccasionLabel, adminGiftCardsSectionTo } from './adminGiftCards';
import { adminGiftCardPaymentStatusLabel } from './adminGiftCardsColumns';
import { AdminOverviewBarChart } from './AdminOverviewBarChart';
import { adminOverviewLinkCardClassName } from './adminOverviewLinkCard';
import { AdminOverviewNavCard } from './AdminOverviewNavCard';
import { adminOverviewRangeResolve, adminOverviewRangeToGraphQlVariables } from './adminOverviewRange';
import type { AdminOverviewRangeSearch } from './adminOverviewRange';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';

export const adminGiftCardsOverviewPageTitle = { de: 'Gutscheinverkäufe', en: 'Voucher Purchases' } as const;
export const adminGiftCardsOverviewPageDescription = {
    de: 'Verteilung, Käufe über die Zeit, Anlässe und stärkste Verkaufsmonate.',
    en: 'Distribution, purchases over time, occasions, and top sales months.',
} as const;

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

    const distribution: {
        key: 'total' | 'payed' | 'prepared';
        label: string;
        value: number;
        status: GqlCGiftCardPaymentStatus | undefined;
    }[] = [
        {
            key: 'total',
            label: { de: 'Gesamt', en: 'Total' }[locale],
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
                        {adminGiftCardsOverviewPageTitle[locale]}
                    </h1>
                    <p className="text-muted-foreground">{adminGiftCardsOverviewPageDescription[locale]}</p>
                </div>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Bereiche', en: 'Sections' }[locale]}</h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        <li>
                            <AdminOverviewNavCard
                                to={adminGiftCardsSectionTo('list')}
                                search={adminGiftCardsListSearch(undefined)}
                                icon={ListIcon}
                            >
                                {{ de: 'Liste', en: 'List' }[locale]}
                            </AdminOverviewNavCard>
                        </li>
                    </ul>
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Verteilung', en: 'Distribution' }[locale]}</h2>
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
                            label={{ de: 'Ø Kaufwert', en: 'Avg. purchase' }[locale]}
                            value={averageCents}
                            displayValue={formatCurrency(averageCents, { locale, maximumFractionDigits: 0 })}
                        />
                    </dl>
                </section>

                <section className="grid gap-3">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <h2 className="text-lg font-medium">{{ de: 'Käufe', en: 'Purchases' }[locale]}</h2>
                        <DateRangePicker
                            value={pickerValue}
                            onValueChange={onRangeChange}
                            locale={DATE_FNS_LOCALE[locale]}
                            placeholder={{ de: 'Zeitraum wählen', en: 'Pick a date range' }[locale]}
                            className="w-auto"
                            aria-label={{ de: 'Zeitraum für Gutscheinkäufe', en: 'Date range for gift card purchases' }[locale]}
                        />
                    </div>
                    <AdminOverviewBarChart
                        data={buckets.map((bucket) => ({ bucketStart: bucket.bucketStart, count: bucket.count }))}
                        locale={locale}
                        timeZone={timeZone}
                        ariaLabel={
                            {
                                de: 'Balkendiagramm der bezahlten Gutscheinkäufe im gewählten Zeitraum',
                                en: 'Bar chart of paid gift card purchases in the selected range',
                            }[locale]
                        }
                    />
                </section>

                <section className="grid gap-3">
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Top 3 über alle bezahlten Käufe (unabhängig vom Diagrammzeitraum).',
                                en: 'Top 3 across all paid purchases (independent of the chart range).',
                            }[locale]
                        }
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 sm:items-start">
                        <div className="grid gap-3">
                            <h2 className="text-lg font-medium">{{ de: 'Top-3-Anlässe', en: 'Top 3 occasions' }[locale]}</h2>
                            {occasionStats.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    {{ de: 'Keine bezahlten Käufe.', en: 'No paid purchases.' }[locale]}
                                </p>
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
                            <h2 className="text-lg font-medium">{{ de: 'Top-3-Verkaufsmonate', en: 'Top 3 sales months' }[locale]}</h2>
                            {salesMonthStats.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    {{ de: 'Keine bezahlten Käufe.', en: 'No paid purchases.' }[locale]}
                                </p>
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
