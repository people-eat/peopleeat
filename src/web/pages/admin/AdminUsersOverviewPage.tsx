import { useNavigate } from '@tanstack/react-router';
import { ListIcon, UserPlusIcon, UsersIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { formatIsoDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { DateRangePicker } from '../../components/base/date-range-picker';
import type { GqlCAdminUserCriterion, GqlCAdminUsersOverviewPageQuery, GqlCAdminUserType } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import { AdminOverviewBarChart } from './AdminOverviewBarChart';
import { AdminOverviewNavCard } from './AdminOverviewNavCard';
import { adminOverviewRangeResolve, adminOverviewRangeToGraphQlVariables } from './adminOverviewRange';
import type { AdminOverviewRangeSearch } from './adminOverviewRange';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';
import { adminUsersSectionTo } from './adminUsers';
import { adminUserTypeLabel } from './adminUsersColumns';

export const adminUsersOverviewPageTitle = { de: 'Benutzer', en: 'Users' } as const;
export const adminUsersOverviewPageDescription = {
    de: 'Verteilung und Registrierungen der Konten.',
    en: 'Account distribution and registrations.',
} as const;

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

export function AdminUsersOverviewPage({ data, search }: { data: GqlCAdminUsersOverviewPageQuery; search: AdminOverviewRangeSearch }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/admin/users' });
    const range = adminOverviewRangeResolve(search);
    const admin = data.currentSession.user?.admin;
    const [total = 0, customer = 0, cook = 0, adminCount = 0] = admin?.userCounts ?? [];
    const buckets = admin?.userRegistrations ?? [];

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
            </main>
        </AdminPathPageChrome>
    );
}
