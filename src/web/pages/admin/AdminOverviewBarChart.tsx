import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

import { formatDate } from '../../../shared';
import type { Locale } from '../../../shared';
import { Card, CardContent } from '../../components/base/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/base/chart';
import type { ChartConfig } from '../../components/base/chart';

export type AdminOverviewBarChartPoint = {
    bucketStart: string | Date;
    count: number;
};

const chartConfig = {
    count: {
        label: 'Count',
        color: 'var(--foreground)',
    },
} satisfies ChartConfig;

export function AdminOverviewBarChart({
    data,
    locale,
    timeZone,
    ariaLabel,
}: {
    data: readonly AdminOverviewBarChartPoint[];
    locale: Locale;
    timeZone: string;
    ariaLabel: string;
}) {
    const chartData = data.map((point) => ({
        bucketStart: point.bucketStart,
        label: formatDate(point.bucketStart, { locale, timeZone, dateStyle: 'short' }),
        count: point.count,
    }));

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
                        <Bar dataKey="count" fill="var(--color-count)" radius={2} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
