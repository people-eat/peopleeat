import { Link, useNavigate } from '@tanstack/react-router';
import { AppWindowIcon, ListIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { t } from '../../../i18n/t';
import { formatIsoDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { DateRangePicker } from '../../components/base/date-range-picker';
import type {
    GqlCAdminSessionBrowser,
    GqlCAdminSessionCriterion,
    GqlCAdminSessionDeviceClass,
    GqlCAdminSessionKind,
    GqlCAdminSessionOperatingSystem,
    GqlCAdminSessionsOverviewPageQuery,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import type { Locale } from '../../utils/locale';
import { AdminOverviewBarChart } from './AdminOverviewBarChart';
import { adminOverviewLinkCardClassName } from './adminOverviewLinkCard';
import { AdminOverviewNavCard } from './AdminOverviewNavCard';
import { adminOverviewRangeResolve, adminOverviewRangeToGraphQlVariables } from './adminOverviewRange';
import type { AdminOverviewRangeSearch } from './adminOverviewRange';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';
import { adminSessionKindLabel, adminSessionsSectionTo } from './adminSessions';

export function adminSessionsOverviewPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'nav.sessions.title');
}
export function adminSessionsOverviewPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.sessionsOverview.description');
}

/** Order matches `sessionCounts` indices on the overview query. */
const ADMIN_SESSION_COUNT_CRITERIA: GqlCAdminSessionCriterion[] = [{ kinds: ['human', 'bot'] }, { kinds: ['human'] }, { kinds: ['bot'] }];

const ADMIN_SESSION_INSIGHTS_TAKE = 10;

export function adminSessionsOverviewPageVariables(search: AdminOverviewRangeSearch = {}) {
    return {
        criteria: ADMIN_SESSION_COUNT_CRITERIA,
        ...adminOverviewRangeToGraphQlVariables(adminOverviewRangeResolve(search)),
        insightsTake: ADMIN_SESSION_INSIGHTS_TAKE,
    };
}

function adminSessionsListSearch({ kind, q }: { kind?: GqlCAdminSessionKind; q?: string } = {}) {
    return {
        q,
        kind,
        page: undefined,
        sort: undefined,
        dir: undefined,
    };
}

function sessionCountShareLabel(count: number, total: number, locale: Locale): string {
    if (total <= 0) return t(locale, 'admin', 'copy.sessionCount', { count });
    const percent = Math.round((count / total) * 100);
    return t(locale, 'admin', 'users.countPercent', { count, percent });
}

function deviceClassLabel(deviceClass: GqlCAdminSessionDeviceClass, locale: Locale): string {
    const labels = {
        mobile: t(locale, 'admin', 'copy.deviceMobile'),
        tablet: t(locale, 'admin', 'copy.deviceTablet'),
        desktop: t(locale, 'admin', 'copy.deviceDesktop'),
        unknown: t(locale, 'admin', 'copy.unknown'),
    } satisfies Record<GqlCAdminSessionDeviceClass, string>;
    return labels[deviceClass];
}

function operatingSystemLabel(operatingSystem: GqlCAdminSessionOperatingSystem, locale: Locale): string {
    const labels = {
        ios: t(locale, 'admin', 'copy.osIos'),
        android: t(locale, 'admin', 'copy.osAndroid'),
        windows: t(locale, 'admin', 'copy.osWindows'),
        macos: t(locale, 'admin', 'copy.osMacos'),
        linux: t(locale, 'admin', 'copy.osLinux'),
        chromeOs: t(locale, 'admin', 'copy.osChromeOs'),
        other: t(locale, 'admin', 'copy.osOther'),
        unknown: t(locale, 'admin', 'copy.unknown'),
    } satisfies Record<GqlCAdminSessionOperatingSystem, string>;
    return labels[operatingSystem];
}

function browserLabel(browser: GqlCAdminSessionBrowser, locale: Locale): string {
    const labels = {
        chrome: t(locale, 'admin', 'copy.browserChrome'),
        safari: t(locale, 'admin', 'copy.browserSafari'),
        firefox: t(locale, 'admin', 'copy.browserFirefox'),
        edge: t(locale, 'admin', 'copy.browserEdge'),
        opera: t(locale, 'admin', 'copy.browserOpera'),
        samsung: t(locale, 'admin', 'copy.browserSamsung'),
        other: t(locale, 'admin', 'copy.browserOther'),
        unknown: t(locale, 'admin', 'copy.unknown'),
    } satisfies Record<GqlCAdminSessionBrowser, string>;
    return labels[browser];
}

function InsightStatRow({
    label,
    count,
    total,
    locale,
    to,
    search,
}: {
    label: string;
    count: number;
    total: number;
    locale: Locale;
    to?: '/{-$locale}/admin/sessions/list';
    search?: ReturnType<typeof adminSessionsListSearch>;
}) {
    const body = (
        <>
            <span className="min-w-0 break-all font-medium text-foreground">{label}</span>
            <span className="text-sm text-muted-foreground tabular-nums">{sessionCountShareLabel(count, total, locale)}</span>
        </>
    );

    if (to == null || search == null) {
        return <div className={adminOverviewLinkCardClassName('flex flex-wrap items-center justify-between gap-3 px-4 py-3')}>{body}</div>;
    }

    return (
        <Link
            to={to}
            search={search}
            className={adminOverviewLinkCardClassName('flex flex-wrap items-center justify-between gap-3 px-4 py-3')}
        >
            {body}
        </Link>
    );
}

export function AdminSessionsOverviewPage({
    data,
    search,
}: {
    data: GqlCAdminSessionsOverviewPageQuery;
    search: AdminOverviewRangeSearch;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/admin/sessions' });
    const range = adminOverviewRangeResolve(search);
    const admin = data.currentSession.user?.admin;
    const [total = 0, human = 0, bot = 0] = admin?.sessionCounts ?? [];
    const buckets = admin?.sessionCreations ?? [];
    const insights = admin?.sessionInsights;
    const insightsTotal = insights?.sessionCount ?? 0;
    const landingPaths = insights?.landingPaths ?? [];
    const referrers = insights?.referrers ?? [];
    const devices = insights?.devices ?? [];
    const operatingSystems = insights?.operatingSystems ?? [];
    const browsers = insights?.browsers ?? [];

    const distribution: {
        key: 'total' | 'human' | 'bot';
        label: string;
        value: number;
        kind: GqlCAdminSessionKind | undefined;
    }[] = [
        {
            key: 'total',
            label: t(locale, 'admin', 'copy.total'),
            value: total,
            kind: undefined,
        },
        {
            key: 'human',
            label: adminSessionKindLabel('human', locale),
            value: human,
            kind: 'human',
        },
        {
            key: 'bot',
            label: adminSessionKindLabel('bot', locale),
            value: bot,
            kind: 'bot',
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
                        <AppWindowIcon className="size-8 text-muted-foreground" aria-hidden />
                        {adminSessionsOverviewPageTitle(locale)}
                    </h1>
                    <p className="text-muted-foreground">{adminSessionsOverviewPageDescription(locale)}</p>
                </div>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.sections')}</h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        <li>
                            <AdminOverviewNavCard to={adminSessionsSectionTo('list')} search={adminSessionsListSearch()} icon={ListIcon}>
                                {t(locale, 'admin', 'copy.list')}
                            </AdminOverviewNavCard>
                        </li>
                    </ul>
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.distribution')}</h2>
                    <dl className="grid grid-cols-3 gap-3">
                        {distribution.map((entry) => (
                            <AdminOverviewStatCard
                                key={entry.key}
                                label={entry.label}
                                value={entry.value}
                                to={adminSessionsSectionTo('list')}
                                search={adminSessionsListSearch({ kind: entry.kind })}
                            />
                        ))}
                    </dl>
                </section>

                <section className="grid gap-3">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.creations')}</h2>
                        <DateRangePicker
                            value={pickerValue}
                            onValueChange={onRangeChange}
                            locale={DATE_FNS_LOCALE[locale]}
                            placeholder={t(locale, 'admin', 'copy.pickADateRange')}
                            className="w-auto"
                            aria-label={t(locale, 'admin', 'copy.dateRangeForSessionCreations')}
                        />
                    </div>
                    <AdminOverviewBarChart
                        data={buckets.map((bucket) => ({ bucketStart: bucket.bucketStart, count: bucket.count }))}
                        locale={locale}
                        timeZone={timeZone}
                        ariaLabel={t(locale, 'admin', 'copy.barChartOfSessionCreationsInTheSelectedRange')}
                    />
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.insights')}</h2>
                    <p className="text-sm text-muted-foreground">
                        {t(locale, 'admin', 'copy.humanSessionsCreatedInTheSelectedRangeBotsAndImpersonationEx')}
                    </p>

                    <div className="grid gap-6 sm:grid-cols-2 sm:items-start">
                        <div className="grid gap-3">
                            <h3 className="text-base font-medium">{t(locale, 'admin', 'copy.topLandingPaths')}</h3>
                            {landingPaths.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noData')}</p>
                            ) : (
                                <ul className="grid gap-2">
                                    {landingPaths.map((stat) => {
                                        const label = stat.landingPath?.trim() || t(locale, 'admin', 'copy.notSet');
                                        const q = stat.landingPath?.trim() || undefined;
                                        return (
                                            <li key={stat.landingPath ?? 'unset'}>
                                                <InsightStatRow
                                                    label={label}
                                                    count={stat.count}
                                                    total={insightsTotal}
                                                    locale={locale}
                                                    to={q ? adminSessionsSectionTo('list') : undefined}
                                                    search={q ? adminSessionsListSearch({ kind: 'human', q }) : undefined}
                                                />
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        <div className="grid gap-3">
                            <h3 className="text-base font-medium">{t(locale, 'admin', 'copy.topReferrers')}</h3>
                            {referrers.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noData')}</p>
                            ) : (
                                <ul className="grid gap-2">
                                    {referrers.map((stat) => {
                                        const q = stat.referrer?.trim() || undefined;
                                        const label = q ?? t(locale, 'admin', 'copy.directTraffic');
                                        return (
                                            <li key={stat.referrer ?? 'direct'}>
                                                <InsightStatRow
                                                    label={label}
                                                    count={stat.count}
                                                    total={insightsTotal}
                                                    locale={locale}
                                                    to={q ? adminSessionsSectionTo('list') : undefined}
                                                    search={q ? adminSessionsListSearch({ kind: 'human', q }) : undefined}
                                                />
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-3 sm:items-start">
                        <div className="grid gap-3">
                            <h3 className="text-base font-medium">{t(locale, 'admin', 'copy.devices')}</h3>
                            {devices.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noData')}</p>
                            ) : (
                                <ul className="grid gap-2">
                                    {devices.map((stat) => (
                                        <li key={stat.deviceClass}>
                                            <InsightStatRow
                                                label={deviceClassLabel(stat.deviceClass, locale)}
                                                count={stat.count}
                                                total={insightsTotal}
                                                locale={locale}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="grid gap-3">
                            <h3 className="text-base font-medium">{t(locale, 'admin', 'copy.operatingSystems')}</h3>
                            {operatingSystems.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noData')}</p>
                            ) : (
                                <ul className="grid gap-2">
                                    {operatingSystems.map((stat) => (
                                        <li key={stat.operatingSystem}>
                                            <InsightStatRow
                                                label={operatingSystemLabel(stat.operatingSystem, locale)}
                                                count={stat.count}
                                                total={insightsTotal}
                                                locale={locale}
                                            />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="grid gap-3">
                            <h3 className="text-base font-medium">{t(locale, 'admin', 'copy.browsers')}</h3>
                            {browsers.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noData')}</p>
                            ) : (
                                <ul className="grid gap-2">
                                    {browsers.map((stat) => (
                                        <li key={stat.browser}>
                                            <InsightStatRow
                                                label={browserLabel(stat.browser, locale)}
                                                count={stat.count}
                                                total={insightsTotal}
                                                locale={locale}
                                            />
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
