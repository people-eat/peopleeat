import { Link, useNavigate } from '@tanstack/react-router';
import { CakeIcon, ListIcon, UserPlusIcon, UsersIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { t } from '../../../i18n/t';
import { formatDate, formatIsoDate, userDisplayName } from '../../../shared';
import type { Locale } from '../../../shared/locale';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Badge } from '../../components/base/badge';
import { DateRangePicker } from '../../components/base/date-range-picker';
import type {
    GqlCAdminUserCriterion,
    GqlCAdminUsersOverviewPageQuery,
    GqlCAdminUserType,
    GqlCUserPreferredCommunication,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import { AdminOverviewBarChart } from './AdminOverviewBarChart';
import { adminOverviewLinkCardClassName } from './adminOverviewLinkCard';
import { AdminOverviewNavCard } from './AdminOverviewNavCard';
import { adminOverviewRangeResolve, adminOverviewRangeToGraphQlVariables } from './adminOverviewRange';
import type { AdminOverviewRangeSearch } from './adminOverviewRange';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';
import { adminUsersSectionTo } from './adminUsers';
import { adminUserTypeLabel } from './adminUsersColumns';

export function adminUsersOverviewPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'nav.users.title');
}
export function adminUsersOverviewPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.usersOverview.description');
}

const ADMIN_USERS_UPCOMING_BIRTHDAYS_TAKE = 12;

/** Order matches `userCounts` indices on the overview query. */
const ADMIN_USER_COUNT_CRITERIA: GqlCAdminUserCriterion[] = [
    { types: ['customer', 'cook', 'admin'] },
    { types: ['customer'] },
    { types: ['cook'] },
    { types: ['admin'] },
];

export function adminUsersOverviewPageVariables(search: AdminOverviewRangeSearch = {}) {
    return {
        criteria: ADMIN_USER_COUNT_CRITERIA,
        upcomingBirthdaysTake: ADMIN_USERS_UPCOMING_BIRTHDAYS_TAKE,
        ...adminOverviewRangeToGraphQlVariables(adminOverviewRangeResolve(search)),
    };
}

function adminUsersListSearch(type: GqlCAdminUserType | undefined) {
    return {
        q: undefined,
        type,
        status: undefined,
        unapproved: undefined,
        page: undefined,
        sort: undefined,
        dir: undefined,
    };
}

function preferredCommunicationLabel(value: GqlCUserPreferredCommunication | null | undefined, locale: Locale): string {
    if (value == null) return t(locale, 'admin', 'copy.notSet');
    const labels = {
        SMS: t(locale, 'admin', 'copy.message'),
        WHATS_APP: t(locale, 'admin', 'copy.whatsapp'),
        CALL: t(locale, 'admin', 'copy.call2'),
        E_MAIL: t(locale, 'admin', 'copy.email'),
    } satisfies Record<GqlCUserPreferredCommunication, string>;
    return labels[value];
}

function localeLabel(value: Locale, uiLocale: Locale): string {
    const labels = {
        de: t(uiLocale, 'common', 'language.de'),
        en: t(uiLocale, 'common', 'language.en'),
        fr: t(uiLocale, 'common', 'language.fr'),
        it: t(uiLocale, 'common', 'language.it'),
        ru: t(uiLocale, 'common', 'language.ru'),
        nl: t(uiLocale, 'common', 'language.nl'),
    } satisfies Record<Locale, string>;
    return labels[value];
}

function countShareLabel(count: number, total: number, locale: Locale): string {
    if (total <= 0) return String(count);
    const percent = Math.round((count / total) * 100);
    return t(locale, 'admin', 'users.countPercent', { count, percent });
}

function formatAgeYears(age: number | null | undefined, locale: Locale): string {
    if (age == null) return t(locale, 'admin', 'copy.nA');
    return age.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US', {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
    });
}

function turningAgeLabel(birthDate: string, nextBirthday: string, locale: Locale): string {
    const birthYear = Number(birthDate.slice(0, 4));
    const nextYear = Number(nextBirthday.slice(0, 4));
    if (!Number.isFinite(birthYear) || !Number.isFinite(nextYear)) return '';
    const age = nextYear - birthYear;
    return t(locale, 'admin', 'users.turnsAge', { age });
}

export function AdminUsersOverviewPage({ data, search }: { data: GqlCAdminUsersOverviewPageQuery; search: AdminOverviewRangeSearch }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/admin/users' });
    const range = adminOverviewRangeResolve(search);
    const admin = data.currentSession.user?.admin;
    const [total = 0, customer = 0, cook = 0, adminCount = 0] = admin?.userCounts ?? [];
    const buckets = admin?.userRegistrations ?? [];
    const insights = admin?.userInsights;
    const upcomingBirthdays = admin?.upcomingBirthdays ?? [];

    const preferredCommunication = insights?.preferredCommunication ?? [];
    const locales = insights?.locales ?? [];
    const timeZones = insights?.timeZones ?? [];
    const accountCount = insights?.accountCount ?? 0;

    const distribution: {
        key: 'total' | 'customer' | 'cook' | 'admin';
        label: string;
        value: number;
        type: GqlCAdminUserType | undefined;
    }[] = [
        {
            key: 'total',
            label: t(locale, 'admin', 'copy.total'),
            value: total,
            type: undefined,
        },
        {
            key: 'customer',
            label: adminUserTypeLabel('customer', locale),
            value: customer,
            type: 'customer',
        },
        {
            key: 'cook',
            label: adminUserTypeLabel('cook', locale),
            value: cook,
            type: 'cook',
        },
        {
            key: 'admin',
            label: adminUserTypeLabel('admin', locale),
            value: adminCount,
            type: 'admin',
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
                        <UsersIcon className="size-8 text-muted-foreground" aria-hidden />
                        {adminUsersOverviewPageTitle(locale)}
                    </h1>
                    <p className="text-muted-foreground">{adminUsersOverviewPageDescription(locale)}</p>
                </div>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.sections')}</h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        <li>
                            <AdminOverviewNavCard to={adminUsersSectionTo('list')} search={adminUsersListSearch(undefined)} icon={ListIcon}>
                                {t(locale, 'admin', 'copy.list')}
                            </AdminOverviewNavCard>
                        </li>
                        <li>
                            <AdminOverviewNavCard to={adminUsersSectionTo('create')} icon={UserPlusIcon}>
                                {t(locale, 'admin', 'copy.create')}
                            </AdminOverviewNavCard>
                        </li>
                    </ul>
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.distribution')}</h2>
                    <p className="text-sm text-muted-foreground">
                        {t(locale, 'admin', 'copy.labelsCanOverlapEGAnAdminWithoutACookRowCountsAsBothAdminAnd')}
                    </p>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {distribution.map((entry) => (
                            <AdminOverviewStatCard
                                key={entry.key}
                                label={entry.label}
                                value={entry.value}
                                to={adminUsersSectionTo('list')}
                                search={adminUsersListSearch(entry.type)}
                            />
                        ))}
                    </dl>
                </section>

                <section className="grid gap-3">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.registrations')}</h2>
                        <DateRangePicker
                            value={pickerValue}
                            onValueChange={onRangeChange}
                            locale={DATE_FNS_LOCALE[locale]}
                            placeholder={t(locale, 'admin', 'copy.pickADateRange')}
                            className="w-auto"
                            aria-label={t(locale, 'admin', 'copy.dateRangeForRegistrations')}
                        />
                    </div>
                    <AdminOverviewBarChart
                        data={buckets.map((bucket) => ({ bucketStart: bucket.bucketStart, count: bucket.count }))}
                        locale={locale}
                        timeZone={timeZone}
                        ariaLabel={t(locale, 'admin', 'copy.barChartOfUserRegistrationsInTheSelectedRange')}
                    />
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.insights')}</h2>
                    <p className="text-sm text-muted-foreground">
                        {t(locale, 'admin', 'copy.acrossAllNonAnonymizedAccountsIndependentOfTheChartRange')}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3 sm:items-start">
                        <div className="grid gap-3">
                            <h3 className="text-base font-medium">{t(locale, 'admin', 'copy.preferredCommunication')}</h3>
                            {preferredCommunication.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noData')}</p>
                            ) : (
                                <ul className="grid gap-2">
                                    {preferredCommunication.map((stat) => (
                                        <li key={stat.preferredCommunication ?? 'unset'}>
                                            <div
                                                className={adminOverviewLinkCardClassName(
                                                    'flex flex-wrap items-center justify-between gap-3 px-4 py-3',
                                                )}
                                            >
                                                <span className="font-medium text-foreground">
                                                    {preferredCommunicationLabel(stat.preferredCommunication, locale)}
                                                </span>
                                                <span className="text-sm text-muted-foreground tabular-nums">
                                                    {countShareLabel(stat.count, accountCount, locale)}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="grid gap-3">
                            <h3 className="text-base font-medium">{t(locale, 'admin', 'copy.locale')}</h3>
                            {locales.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noData')}</p>
                            ) : (
                                <ul className="grid gap-2">
                                    {locales.map((stat) => (
                                        <li key={stat.locale}>
                                            <div
                                                className={adminOverviewLinkCardClassName(
                                                    'flex flex-wrap items-center justify-between gap-3 px-4 py-3',
                                                )}
                                            >
                                                <span className="font-medium text-foreground">{localeLabel(stat.locale, locale)}</span>
                                                <span className="text-sm text-muted-foreground tabular-nums">
                                                    {countShareLabel(stat.count, accountCount, locale)}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="grid gap-3">
                            <h3 className="text-base font-medium">{t(locale, 'admin', 'copy.timeZone')}</h3>
                            {timeZones.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noData')}</p>
                            ) : (
                                <ul className="grid gap-2">
                                    {timeZones.map((stat) => (
                                        <li key={stat.timeZone}>
                                            <div
                                                className={adminOverviewLinkCardClassName(
                                                    'flex flex-wrap items-center justify-between gap-3 px-4 py-3',
                                                )}
                                            >
                                                <span className="min-w-0 break-all font-medium text-foreground">{stat.timeZone}</span>
                                                <span className="text-sm text-muted-foreground tabular-nums">
                                                    {countShareLabel(stat.count, accountCount, locale)}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                    <div className="grid gap-3">
                        <h3 className="text-base font-medium">{t(locale, 'admin', 'copy.signInMethods')}</h3>
                        <p className="text-sm text-muted-foreground">
                            {t(locale, 'admin', 'copy.overlappingOneAccountCanHaveGoogleAndAPasskey')}
                        </p>
                        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {(
                                [
                                    {
                                        key: 'google',
                                        label: t(locale, 'admin', 'copy.googleLinked'),
                                        count: insights?.googleLinkedAccountCount ?? 0,
                                    },
                                    {
                                        key: 'facebook',
                                        label: t(locale, 'admin', 'copy.facebookLinked'),
                                        count: insights?.facebookLinkedAccountCount ?? 0,
                                    },
                                    {
                                        key: 'passkey',
                                        label: t(locale, 'admin', 'copy.passkeyPresent'),
                                        count: insights?.passkeyAccountCount ?? 0,
                                    },
                                    {
                                        key: 'totp',
                                        label: t(locale, 'admin', 'copy.authenticatorApp'),
                                        count: insights?.totpAccountCount ?? 0,
                                    },
                                ] as const
                            ).map((stat) => (
                                <li key={stat.key}>
                                    <div
                                        className={adminOverviewLinkCardClassName(
                                            'flex flex-wrap items-center justify-between gap-3 px-4 py-3',
                                        )}
                                    >
                                        <span className="font-medium text-foreground">{stat.label}</span>
                                        <span className="text-sm text-muted-foreground tabular-nums">
                                            {countShareLabel(stat.count, accountCount, locale)}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section className="grid gap-3">
                    <h2 className="flex items-center gap-2 text-lg font-medium">
                        <CakeIcon className="size-5 text-muted-foreground" aria-hidden />
                        {t(locale, 'admin', 'copy.ageAndBirthdays')}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {t(locale, 'admin', 'copy.ageStatsBySegmentAndNextBirthdaysAccountsWithABirthDateOnlyA')}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-3 sm:items-start">
                        {(
                            [
                                {
                                    key: 'cooks',
                                    label: t(locale, 'admin', 'copy.cooks'),
                                    age: insights?.ageBySegment.cooks,
                                },
                                {
                                    key: 'potentialCustomers',
                                    label: t(locale, 'admin', 'copy.potentialCustomers'),
                                    age: insights?.ageBySegment.potentialCustomers,
                                },
                                {
                                    key: 'actualCustomers',
                                    label: t(locale, 'admin', 'copy.actualCustomers'),
                                    age: insights?.ageBySegment.actualCustomers,
                                },
                            ] as const
                        ).map((segment) => (
                            <div key={segment.key} className="grid gap-3">
                                <h3 className="text-base font-medium">{segment.label}</h3>
                                <dl className="grid gap-2">
                                    <AdminOverviewStatCard
                                        label={t(locale, 'admin', 'copy.medianAge')}
                                        value={segment.age?.medianAge ?? 0}
                                        displayValue={formatAgeYears(segment.age?.medianAge, locale)}
                                    />
                                    <AdminOverviewStatCard
                                        label={t(locale, 'admin', 'copy.averageAge')}
                                        value={segment.age?.averageAge ?? 0}
                                        displayValue={formatAgeYears(segment.age?.averageAge, locale)}
                                    />
                                    <AdminOverviewStatCard
                                        label={t(locale, 'admin', 'copy.withBirthDate')}
                                        value={segment.age?.birthDateSampleSize ?? 0}
                                    />
                                </dl>
                            </div>
                        ))}
                    </div>
                    <h3 className="text-base font-medium">{t(locale, 'admin', 'copy.upcomingBirthdays')}</h3>
                    {upcomingBirthdays.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noUpcomingBirthdays')}</p>
                    ) : (
                        <ul className="grid gap-2">
                            {upcomingBirthdays.map((entry) => (
                                <li key={entry.userId}>
                                    <Link
                                        to="/{-$locale}/admin/users/$userId"
                                        params={{ userId: entry.userId }}
                                        className={adminOverviewLinkCardClassName(
                                            'flex flex-wrap items-center justify-between gap-3 px-4 py-3',
                                        )}
                                    >
                                        <span className="flex min-w-0 flex-wrap items-center gap-2">
                                            <span className="font-medium text-foreground">{userDisplayName(entry)}</span>
                                            {entry.types.map((type) => (
                                                <Badge key={type} variant="outline">
                                                    {adminUserTypeLabel(type, locale)}
                                                </Badge>
                                            ))}
                                        </span>
                                        <span className="text-sm text-muted-foreground tabular-nums">
                                            {formatDate(entry.nextBirthday, { locale, timeZone, dateStyle: 'medium' })}
                                            <span className="text-muted-foreground/80">
                                                {` · ${turningAgeLabel(entry.birthDate, entry.nextBirthday, locale)}`}
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </main>
        </AdminPathPageChrome>
    );
}
