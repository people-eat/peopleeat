import { t } from '../../../i18n/t';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/base/table';
import type { GqlCAdminAnalyticsPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { adminTrafficSearchForAnalyticsTab } from './adminAnalyticsSearch';
import { AdminOverviewBarChart } from './AdminOverviewBarChart';
import type { AdminOverviewDateRange } from './adminOverviewRange';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';
import { AdminRelatedPageLinks } from './AdminRelatedPageLink';

type AdminAnalyticsAdmin = NonNullable<NonNullable<GqlCAdminAnalyticsPageQuery['currentSession']['user']>['admin']>;

export function AdminAnalyticsSignInTab({ admin, range }: { admin: AdminAnalyticsAdmin; range: AdminOverviewDateRange }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const signInMethodStats = admin.signInMethodStats;
    const signInMethods = signInMethodStats?.methods ?? [];
    const signInBucketsByDate = new Map<
        string,
        { bucketStart: string; EMAIL_OTP: number; PASSKEY: number; GOOGLE: number; FACEBOOK: number }
    >();
    for (const bucket of signInMethodStats?.buckets ?? []) {
        const row = signInBucketsByDate.get(bucket.date) ?? {
            bucketStart: bucket.date,
            EMAIL_OTP: 0,
            PASSKEY: 0,
            GOOGLE: 0,
            FACEBOOK: 0,
        };
        row[bucket.method] = bucket.signInCount;
        signInBucketsByDate.set(bucket.date, row);
    }
    const signInChartData = Array.from(signInBucketsByDate.values());
    const signInTotal = signInMethods.reduce((sum, row) => sum + row.signInCount, 0);
    const registrationTicketTotal = signInMethods.reduce((sum, row) => sum + row.registrationTicketCount, 0);
    const accountCreatedTotal = signInMethods.reduce((sum, row) => sum + row.accountCreatedCount, 0);
    const failedTotal = signInMethods.reduce((sum, row) => sum + row.failedCount, 0);
    const attemptedTotal = signInTotal + failedTotal;
    const failurePercent = attemptedTotal > 0 ? Math.round((failedTotal / attemptedTotal) * 100) : null;

    function signInMethodLabel(method: string): string {
        const labels = {
            EMAIL_OTP: t(locale, 'admin', 'copy.emailCode'),
            PASSKEY: t(locale, 'admin', 'copy.passkey'),
            GOOGLE: t(locale, 'admin', 'copy.google'),
            FACEBOOK: t(locale, 'admin', 'copy.facebook'),
        } as const;
        return method in labels ? labels[method as keyof typeof labels] : method;
    }

    return (
        <section className="grid gap-3">
            <h2 className="font-serif text-2xl text-foreground">{t(locale, 'admin', 'copy.signInMethods')}</h2>
            <p className="text-sm text-muted-foreground">
                {t(locale, 'admin', 'copy.humanSessionsWithoutImpersonationCooksIncludedSignInsExistin')}
            </p>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <AdminOverviewStatCard label={t(locale, 'admin', 'copy.signIns')} value={signInTotal} />
                <AdminOverviewStatCard label={t(locale, 'admin', 'copy.registrations')} value={registrationTicketTotal} />
                <AdminOverviewStatCard label={t(locale, 'admin', 'copy.accountsCreated')} value={accountCreatedTotal} />
                <AdminOverviewStatCard
                    label={t(locale, 'admin', 'analytics.signIn.failureRate')}
                    value={failurePercent ?? 0}
                    displayValue={failurePercent == null ? t(locale, 'admin', 'copy.nA') : `${failurePercent}\u00a0%`}
                />
            </dl>
            <Table aria-label={t(locale, 'admin', 'copy.signInMethods')}>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t(locale, 'admin', 'copy.method')}</TableHead>
                        <TableHead className="text-right">{t(locale, 'admin', 'copy.signIns')}</TableHead>
                        <TableHead className="text-right">{t(locale, 'admin', 'copy.registrations')}</TableHead>
                        <TableHead className="text-right">{t(locale, 'admin', 'copy.accountsCreated')}</TableHead>
                        <TableHead className="text-right">{t(locale, 'admin', 'copy.failures')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {signInMethods.map((row) => (
                        <TableRow key={row.method}>
                            <TableCell className="font-medium">{signInMethodLabel(row.method)}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.signInCount}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.registrationTicketCount}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.accountCreatedCount}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.failedCount}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <AdminOverviewBarChart
                data={signInChartData}
                locale={locale}
                timeZone={timeZone}
                ariaLabel={t(locale, 'admin', 'copy.signInsByMethod')}
                series={[
                    { dataKey: 'EMAIL_OTP', label: signInMethodLabel('EMAIL_OTP'), color: 'var(--chart-2)' },
                    { dataKey: 'PASSKEY', label: signInMethodLabel('PASSKEY'), color: 'var(--chart-3)' },
                    { dataKey: 'GOOGLE', label: signInMethodLabel('GOOGLE'), color: 'var(--chart-1)' },
                    { dataKey: 'FACEBOOK', label: signInMethodLabel('FACEBOOK'), color: 'var(--chart-4)' },
                ]}
            />
            <AdminRelatedPageLinks
                links={[
                    {
                        to: '/{-$locale}/admin/users',
                        search: { from: range.from, to: range.to },
                        label: t(locale, 'admin', 'nav.users.title'),
                    },
                    {
                        to: '/{-$locale}/admin/sessions',
                        search: { from: range.from, to: range.to },
                        label: t(locale, 'admin', 'nav.sessions.title'),
                    },
                    {
                        to: '/{-$locale}/admin/traffic',
                        search: adminTrafficSearchForAnalyticsTab(range, 'sign-in'),
                        label: t(locale, 'admin', 'nav.traffic.title'),
                    },
                ]}
            />
        </section>
    );
}
