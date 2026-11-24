import { CartesianGrid, Line, LineChart, XAxis } from 'recharts';

import { formatDate } from '../../../shared';
import type { Locale } from '../../../shared';
import { Card, CardContent } from '../../components/base/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/base/chart';
import type { ChartConfig } from '../../components/base/chart';

export type AdminOverviewLineChartSeries = {
    dataKey: string;
    label: string;
    color: string;
};

export type AdminOverviewLineChartPoint = {
    bucketStart: string | Date;
    [key: string]: string | Date | number | undefined;
};

export function AdminOverviewLineChart({
    data,
    locale,
    timeZone,
    ariaLabel,
    series,
}: {
    data: readonly AdminOverviewLineChartPoint[];
    locale: Locale;
    timeZone: string;
    ariaLabel: string;
    series: readonly AdminOverviewLineChartSeries[];
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
                    <LineChart accessibilityLayer data={chartData} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
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
                            <Line
                                key={entry.dataKey}
                                type="monotone"
                                dataKey={entry.dataKey}
                                stroke={`var(--color-${entry.dataKey})`}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 3 }}
                            />
                        ))}
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
