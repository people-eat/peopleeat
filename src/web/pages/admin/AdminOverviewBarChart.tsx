import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

import { formatDate, formatMonthYear } from '../../../shared';
import type { Locale } from '../../../shared';
import { Card, CardContent } from '../../components/base/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/base/chart';
import type { ChartConfig } from '../../components/base/chart';

export type AdminOverviewBarChartSeries = {
    dataKey: string;
    label: string;
    color: string;
};

export type AdminOverviewBarChartPoint = {
    bucketStart: string | Date;
    count?: number;
    [key: string]: string | Date | number | undefined;
};

export type AdminOverviewBarChartBucketLabel = 'short' | 'monthYear';

const defaultSeries: AdminOverviewBarChartSeries[] = [
    {
        dataKey: 'count',
        label: 'Count',
        color: 'var(--foreground)',
    },
];

function formatBucketLabel(
    bucketStart: string | Date,
    locale: Locale,
    timeZone: string,
    bucketLabel: AdminOverviewBarChartBucketLabel,
    style: 'tick' | 'tooltip',
): string {
    if (bucketLabel === 'monthYear') {
        return formatMonthYear(bucketStart, {
            locale,
            timeZone,
            month: style === 'tooltip' ? 'long' : 'short',
        });
    }
    return formatDate(bucketStart, {
        locale,
        timeZone,
        dateStyle: style === 'tooltip' ? 'medium' : 'short',
    });
}

export function AdminOverviewBarChart({
    data,
    locale,
    timeZone,
    ariaLabel,
    series = defaultSeries,
    bucketLabel = 'short',
}: {
    data: readonly AdminOverviewBarChartPoint[];
    locale: Locale;
    timeZone: string;
    ariaLabel: string;
    series?: readonly AdminOverviewBarChartSeries[];
    bucketLabel?: AdminOverviewBarChartBucketLabel;
}) {
    const chartConfig = Object.fromEntries(
        series.map((entry) => [entry.dataKey, { label: entry.label, color: entry.color }]),
    ) as ChartConfig;
    const chartData = data.map((point) => {
        const row: Record<string, string | Date | number | undefined> = {
            bucketStart: point.bucketStart,
            label: formatBucketLabel(point.bucketStart, locale, timeZone, bucketLabel, 'tick'),
        };
        for (const entry of series) {
            const value = point[entry.dataKey];
            row[entry.dataKey] = typeof value === 'number' ? value : 0;
        }
        return row;
    });

    return (
        <Card>
            <CardContent>
                <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full" aria-label={ariaLabel}>
                    <BarChart accessibilityLayer data={chartData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(_, payload) => {
                                        const bucketStart = payload[0]?.payload?.bucketStart as string | Date | undefined;
                                        return bucketStart ? formatBucketLabel(bucketStart, locale, timeZone, bucketLabel, 'tooltip') : '';
                                    }}
                                />
                            }
                        />
                        {series.map((entry) => (
                            <Bar key={entry.dataKey} dataKey={entry.dataKey} fill={`var(--color-${entry.dataKey})`} radius={2} />
                        ))}
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
