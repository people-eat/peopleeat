import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

import { formatDate } from '../../../shared';
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

const defaultSeries: AdminOverviewBarChartSeries[] = [
    {
        dataKey: 'count',
        label: 'Count',
        color: 'var(--foreground)',
    },
];

export function AdminOverviewBarChart({
    data,
    locale,
    timeZone,
    ariaLabel,
    series = defaultSeries,
}: {
    data: readonly AdminOverviewBarChartPoint[];
    locale: Locale;
    timeZone: string;
    ariaLabel: string;
    series?: readonly AdminOverviewBarChartSeries[];
}) {
    const chartConfig = Object.fromEntries(
        series.map((entry) => [entry.dataKey, { label: entry.label, color: entry.color }]),
    ) as ChartConfig;
    const chartData = data.map((point) => {
        const row: Record<string, string | Date | number | undefined> = {
            bucketStart: point.bucketStart,
            label: formatDate(point.bucketStart, { locale, timeZone, dateStyle: 'short' }),
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
                                        return bucketStart ? formatDate(bucketStart, { locale, timeZone, dateStyle: 'medium' }) : '';
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
