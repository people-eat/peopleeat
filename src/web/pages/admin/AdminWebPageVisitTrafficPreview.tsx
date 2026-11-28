import { Link } from '@tanstack/react-router';

import { t } from '../../../i18n/t';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { AdminOverviewLineChart } from './AdminOverviewLineChart';

export function AdminWebPageVisitTrafficPreview({
    pageviews,
    seriesLabel,
    buckets,
    trafficSearch,
}: {
    pageviews: number;
    seriesLabel: string;
    buckets: readonly { bucketStart: string; count: number }[];
    trafficSearch: {
        keys: string;
        from: string;
        to: string;
        granularity: 'week';
        cityId?: string;
    };
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const dataKey = 'visits';
    const chartData = buckets.map((bucket) => ({
        bucketStart: bucket.bucketStart,
        [dataKey]: bucket.count,
    }));

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                    <h2 className="text-sm font-medium">{t(locale, 'admin', 'traffic.last90Days')}</h2>
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'traffic.visits90d', { count: pageviews })}</p>
                </div>
                <Link
                    to="/{-$locale}/admin/traffic"
                    search={trafficSearch}
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                    {t(locale, 'admin', 'traffic.viewTraffic')}
                </Link>
            </div>
            <AdminOverviewLineChart
                data={chartData}
                locale={locale}
                timeZone={timeZone}
                ariaLabel={t(locale, 'admin', 'traffic.chart')}
                series={[
                    {
                        dataKey,
                        label: seriesLabel,
                        color: 'var(--chart-1)',
                    },
                ]}
            />
        </div>
    );
}
