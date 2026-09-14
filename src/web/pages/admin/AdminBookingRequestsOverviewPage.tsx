import { Link, useNavigate } from '@tanstack/react-router';
import { FileInputIcon, ListIcon, PlusIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { formatCurrency, formatIsoDate, formatMonthYear } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { DateRangePicker } from '../../components/base/date-range-picker';
import type {
    GqlCAdminBookingRequestCriterion,
    GqlCAdminBookingRequestsOverviewPageQuery,
    GqlCBookingRequestPublicationStatus,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import { adminBookingRequestsSectionTo } from './adminBookingRequests';
import { adminBookingRequestPublicationStatusLabel } from './adminBookingRequestsColumns';
import { AdminOverviewBarChart } from './AdminOverviewBarChart';
import { adminOverviewLinkCardClassName } from './adminOverviewLinkCard';
import { AdminOverviewNavCard } from './AdminOverviewNavCard';
import { adminOverviewRangeResolve, adminOverviewRangeToGraphQlVariables } from './adminOverviewRange';
import type { AdminOverviewRangeSearch } from './adminOverviewRange';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';

export const adminBookingRequestsOverviewPageTitle = { de: 'Buchungsanfragen', en: 'Booking Requests' } as const;
export const adminBookingRequestsOverviewPageDescription = {
    de: 'Verteilung, Neuanlagen, Anlässe, Angebote und Koch-Rankings.',
    en: 'Distribution, creations, occasions, offers, and cook rankings.',
} as const;

/** Order matches `bookingRequestsCounts` indices on the overview query. */
const ADMIN_BOOKING_REQUEST_COUNT_CRITERIA: GqlCAdminBookingRequestCriterion[] = [
    {},
    { publicationStatuses: ['PUBLICATION_BLOCKED_BY_ADMIN_REVIEW'] },
    { publicationStatuses: ['PUBLICATION_AUTO_APPROVED'] },
    { publicationStatuses: ['PUBLICATION_APPROVED_BY_ADMIN'] },
];

const ADMIN_BOOKING_REQUEST_RANKING_TAKE = 3;

export function adminBookingRequestsOverviewPageVariables(search: AdminOverviewRangeSearch = {}) {
    return {
        criteria: ADMIN_BOOKING_REQUEST_COUNT_CRITERIA,
        ...adminOverviewRangeToGraphQlVariables(adminOverviewRangeResolve(search)),
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

function participantsLabel(count: number, locale: 'de' | 'en'): string {
    return {
        de: count === 1 ? '1 Gast' : `${count} Gäste`,
        en: count === 1 ? '1 guest' : `${count} guests`,
    }[locale];
}

function formatAverageOffers(value: number, locale: 'de' | 'en'): string {
    return value.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
    });
}

export function AdminBookingRequestsOverviewPage({
    data,
    search,
}: {
    data: GqlCAdminBookingRequestsOverviewPageQuery;
    search: AdminOverviewRangeSearch;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/admin/booking-requests' });
    const range = adminOverviewRangeResolve(search);
    const admin = data.currentSession.user?.admin;
    const [total = 0, blocked = 0, autoApproved = 0, adminApproved = 0] = admin?.bookingRequestsCounts ?? [];
    const buckets = admin?.bookingRequestCreations ?? [];
    const occasionStats = admin?.bookingRequestOccasionStats ?? [];
    const creationMonthStats = admin?.bookingRequestCreationMonthStats ?? [];
    const averageParticipants = admin?.bookingRequestAverageParticipants ?? 0;
    const economics = admin?.bookingRequestOfferEconomics;
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
            label: { de: 'Gesamt', en: 'Total' }[locale],
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
                        <FileInputIcon className="size-8 text-muted-foreground" aria-hidden />
                        {adminBookingRequestsOverviewPageTitle[locale]}
                    </h1>
                    <p className="text-muted-foreground">{adminBookingRequestsOverviewPageDescription[locale]}</p>
                </div>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Bereiche', en: 'Sections' }[locale]}</h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        <li>
                            <AdminOverviewNavCard
                                to={adminBookingRequestsSectionTo('list')}
                                search={adminBookingRequestsListSearch(undefined)}
                                icon={ListIcon}
                            >
                                {{ de: 'Liste', en: 'List' }[locale]}
                            </AdminOverviewNavCard>
                        </li>
                        <li>
                            <AdminOverviewNavCard to={adminBookingRequestsSectionTo('create')} icon={PlusIcon}>
                                {{ de: 'Anlegen', en: 'Create' }[locale]}
                            </AdminOverviewNavCard>
                        </li>
                    </ul>
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Verteilung', en: 'Distribution' }[locale]}</h2>
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
                            label={{ de: 'Ø Gäste', en: 'Avg. guests' }[locale]}
                            value={averageParticipants}
                            displayValue={String(averageParticipants)}
                        />
                    </dl>
                </section>

                <section className="grid gap-3">
                    <div className="grid gap-1">
                        <h2 className="text-lg font-medium">{{ de: 'Angebote & Umsatz', en: 'Offers & revenue' }[locale]}</h2>
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Über alle Anfragen und bezahlte Angebote (unabhängig vom Diagrammzeitraum).',
                                    en: 'Across all requests and paid offers (independent of the chart range).',
                                }[locale]
                            }
                        </p>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <AdminOverviewStatCard
                            label={{ de: 'Ø Angebote', en: 'Avg. offers' }[locale]}
                            value={economics?.averageOffersPerRequest ?? 0}
                            displayValue={formatAverageOffers(economics?.averageOffersPerRequest ?? 0, locale)}
                        />
                        <AdminOverviewStatCard
                            label={{ de: 'Ø Angebotspreis', en: 'Avg. offer price' }[locale]}
                            value={economics?.averageMenuPriceCents ?? 0}
                            displayValue={formatCurrency(economics?.averageMenuPriceCents ?? 0, {
                                locale,
                                maximumFractionDigits: 0,
                            })}
                        />
                        <AdminOverviewStatCard
                            label={{ de: 'Ø Umsatz', en: 'Avg. revenue' }[locale]}
                            value={economics?.averagePaidCustomerTotalCents ?? 0}
                            displayValue={formatCurrency(economics?.averagePaidCustomerTotalCents ?? 0, {
                                locale,
                                maximumFractionDigits: 0,
                            })}
                        />
                        <AdminOverviewStatCard
                            label={{ de: 'Ø Plattformgebühr', en: 'Avg. platform fee' }[locale]}
                            value={economics?.averagePaidPlatformRevenueCents ?? 0}
                            displayValue={formatCurrency(economics?.averagePaidPlatformRevenueCents ?? 0, {
                                locale,
                                maximumFractionDigits: 0,
                            })}
                        />
                    </dl>
                </section>

                <section className="grid gap-3">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <h2 className="text-lg font-medium">{{ de: 'Neuanlagen', en: 'Creations' }[locale]}</h2>
                        <DateRangePicker
                            value={pickerValue}
                            onValueChange={onRangeChange}
                            locale={DATE_FNS_LOCALE[locale]}
                            placeholder={{ de: 'Zeitraum wählen', en: 'Pick a date range' }[locale]}
                            className="w-auto"
                            aria-label={
                                { de: 'Zeitraum für Buchungsanfrage-Neuanlagen', en: 'Date range for booking request creations' }[locale]
                            }
                        />
                    </div>
                    <AdminOverviewBarChart
                        data={buckets.map((bucket) => ({ bucketStart: bucket.bucketStart, count: bucket.count }))}
                        locale={locale}
                        timeZone={timeZone}
                        ariaLabel={
                            {
                                de: 'Balkendiagramm der Buchungsanfrage-Neuanlagen im gewählten Zeitraum',
                                en: 'Bar chart of booking request creations in the selected range',
                            }[locale]
                        }
                    />
                </section>

                <section className="grid gap-3">
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Top 3 über alle Anfragen (unabhängig vom Diagrammzeitraum).',
                                en: 'Top 3 across all requests (independent of the chart range).',
                            }[locale]
                        }
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 sm:items-start">
                        <div className="grid gap-3">
                            <h2 className="text-lg font-medium">{{ de: 'Top-3-Anlässe', en: 'Top 3 occasions' }[locale]}</h2>
                            {occasionStats.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{{ de: 'Keine Anfragen.', en: 'No requests.' }[locale]}</p>
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
                            <h2 className="text-lg font-medium">{{ de: 'Top-3-Monate', en: 'Top 3 months' }[locale]}</h2>
                            {creationMonthStats.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{{ de: 'Keine Anfragen.', en: 'No requests.' }[locale]}</p>
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
                        {
                            {
                                de: 'Top 3 Köche über alle Angebote (unabhängig vom Diagrammzeitraum).',
                                en: 'Top 3 cooks across all offers (independent of the chart range).',
                            }[locale]
                        }
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 sm:items-start">
                        <div className="grid gap-3">
                            <h2 className="text-lg font-medium">{{ de: 'Meiste Angebote', en: 'Most offers' }[locale]}</h2>
                            {cooksByOffers.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{{ de: 'Keine Angebote.', en: 'No offers.' }[locale]}</p>
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
                                                    {
                                                        {
                                                            de: `${stat.offerCount} Angebote · ${stat.conversionCount} Zusagen`,
                                                            en: `${stat.offerCount} offers · ${stat.conversionCount} conversions`,
                                                        }[locale]
                                                    }
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="grid gap-3">
                            <h2 className="text-lg font-medium">{{ de: 'Meiste Zusagen', en: 'Most conversions' }[locale]}</h2>
                            {cooksByConversions.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{{ de: 'Keine Zusagen.', en: 'No conversions.' }[locale]}</p>
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
                                                    {
                                                        {
                                                            de: `${stat.conversionCount} Zusagen · ${stat.offerCount} Angebote`,
                                                            en: `${stat.conversionCount} conversions · ${stat.offerCount} offers`,
                                                        }[locale]
                                                    }
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
