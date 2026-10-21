import { Link, useNavigate } from '@tanstack/react-router';
import { CakeIcon, ListIcon, UserPlusIcon, UsersIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

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

export const adminUsersOverviewPageTitle = { de: 'Benutzer', en: 'Users' } as const;
export const adminUsersOverviewPageDescription = {
    de: 'Verteilung, Einblicke und Registrierungen der Konten.',
    en: 'Account distribution, insights, and registrations.',
} as const;

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
    if (value == null) return { de: 'Nicht angegeben', en: 'Not set' }[locale];
    return {
        SMS: { de: 'Nachricht', en: 'Message' },
        WHATS_APP: { de: 'WhatsApp', en: 'WhatsApp' },
        CALL: { de: 'Anruf', en: 'Call' },
        E_MAIL: { de: 'E-Mail', en: 'Email' },
    }[value][locale];
}

function localeLabel(value: Locale, uiLocale: Locale): string {
    return {
        de: { de: 'Deutsch', en: 'German' },
        en: { de: 'Englisch', en: 'English' },
    }[value][uiLocale];
}

function countShareLabel(count: number, total: number, locale: Locale): string {
    if (total <= 0) return String(count);
    const percent = Math.round((count / total) * 100);
    return { de: `${count} · ${percent} %`, en: `${count} · ${percent}%` }[locale];
}

function formatAgeYears(age: number | null | undefined, locale: Locale): string {
    if (age == null) return { de: 'k. A.', en: 'n/a' }[locale];
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
    return { de: `wird ${age}`, en: `turns ${age}` }[locale];
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
            label: { de: 'Gesamt', en: 'Total' }[locale],
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
                        {adminUsersOverviewPageTitle[locale]}
                    </h1>
                    <p className="text-muted-foreground">{adminUsersOverviewPageDescription[locale]}</p>
                </div>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Bereiche', en: 'Sections' }[locale]}</h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        <li>
                            <AdminOverviewNavCard to={adminUsersSectionTo('list')} search={adminUsersListSearch(undefined)} icon={ListIcon}>
                                {{ de: 'Liste', en: 'List' }[locale]}
                            </AdminOverviewNavCard>
                        </li>
                        <li>
                            <AdminOverviewNavCard to={adminUsersSectionTo('create')} icon={UserPlusIcon}>
                                {{ de: 'Anlegen', en: 'Create' }[locale]}
                            </AdminOverviewNavCard>
                        </li>
                    </ul>
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Verteilung', en: 'Distribution' }[locale]}</h2>
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Typen können sich überschneiden (z. B. Admin ohne Koch-Zeile zählt als Admin und Kunde).',
                                en: 'Labels can overlap (e.g. an admin without a cook row counts as both admin and customer).',
                            }[locale]
                        }
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
                        <h2 className="text-lg font-medium">{{ de: 'Registrierungen', en: 'Registrations' }[locale]}</h2>
                        <DateRangePicker
                            value={pickerValue}
                            onValueChange={onRangeChange}
                            locale={DATE_FNS_LOCALE[locale]}
                            placeholder={{ de: 'Zeitraum wählen', en: 'Pick a date range' }[locale]}
                            className="w-auto"
                            aria-label={{ de: 'Zeitraum für Registrierungen', en: 'Date range for registrations' }[locale]}
                        />
                    </div>
                    <AdminOverviewBarChart
                        data={buckets.map((bucket) => ({ bucketStart: bucket.bucketStart, count: bucket.count }))}
                        locale={locale}
                        timeZone={timeZone}
                        ariaLabel={
                            {
                                de: 'Balkendiagramm der Benutzer-Registrierungen im gewählten Zeitraum',
                                en: 'Bar chart of user registrations in the selected range',
                            }[locale]
                        }
                    />
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Einblicke', en: 'Insights' }[locale]}</h2>
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Über alle nicht anonymisierten Konten (unabhängig vom Diagrammzeitraum).',
                                en: 'Across all non-anonymized accounts (independent of the chart range).',
                            }[locale]
                        }
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3 sm:items-start">
                        <div className="grid gap-3">
                            <h3 className="text-base font-medium">
                                {{ de: 'Bevorzugte Kommunikation', en: 'Preferred communication' }[locale]}
                            </h3>
                            {preferredCommunication.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{{ de: 'Keine Daten.', en: 'No data.' }[locale]}</p>
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
                            <h3 className="text-base font-medium">{{ de: 'Sprache', en: 'Locale' }[locale]}</h3>
                            {locales.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{{ de: 'Keine Daten.', en: 'No data.' }[locale]}</p>
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
                            <h3 className="text-base font-medium">{{ de: 'Zeitzone', en: 'Time zone' }[locale]}</h3>
                            {timeZones.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{{ de: 'Keine Daten.', en: 'No data.' }[locale]}</p>
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
                </section>

                <section className="grid gap-3">
                    <h2 className="flex items-center gap-2 text-lg font-medium">
                        <CakeIcon className="size-5 text-muted-foreground" aria-hidden />
                        {{ de: 'Alter und Geburtstage', en: 'Age and birthdays' }[locale]}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Altersstatistik und nächste Geburtstage (nur Konten mit Geburtsdatum, anonymisierte ausgeschlossen).',
                                en: 'Age stats and next birthdays (accounts with a birth date only, anonymized excluded).',
                            }[locale]
                        }
                    </p>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <AdminOverviewStatCard
                            label={{ de: 'Medianalter', en: 'Median age' }[locale]}
                            value={insights?.medianAge ?? 0}
                            displayValue={formatAgeYears(insights?.medianAge, locale)}
                        />
                        <AdminOverviewStatCard
                            label={{ de: 'Durchschnittsalter', en: 'Average age' }[locale]}
                            value={insights?.averageAge ?? 0}
                            displayValue={formatAgeYears(insights?.averageAge, locale)}
                        />
                        <AdminOverviewStatCard
                            label={{ de: 'Mit Geburtsdatum', en: 'With birth date' }[locale]}
                            value={insights?.birthDateSampleSize ?? 0}
                        />
                    </dl>
                    <h3 className="text-base font-medium">{{ de: 'Kommende Geburtstage', en: 'Upcoming birthdays' }[locale]}</h3>
                    {upcomingBirthdays.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {{ de: 'Keine kommenden Geburtstage.', en: 'No upcoming birthdays.' }[locale]}
                        </p>
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
