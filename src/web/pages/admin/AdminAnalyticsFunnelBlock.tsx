import { useState } from 'react';
import type { ReactNode } from 'react';
import { Layer, Rectangle, ResponsiveContainer, Sankey, Tooltip, useChartWidth } from 'recharts';

import { t } from '../../../i18n/t';
import { Card, CardContent } from '../../components/base/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/base/table';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import { useLocale } from '../../hooks/useLocale';

const SANKEY_HEIGHT = 384;

export type AdminAnalyticsFunnelStep = {
    id: string;
    label: string;
    enteredCount: number;
    completedCount: number;
};

export type AdminAnalyticsFunnelFlow =
    | {
          nodes: ReadonlyArray<{ id: string; label: string }>;
          links: ReadonlyArray<{ source: string; target: string; value: number }>;
      }
    | null
    | undefined;

function AdminAnalyticsSankeyNode({
    x,
    y,
    width,
    height,
    index,
    payload,
}: {
    x: number;
    y: number;
    width: number;
    height: number;
    index: number;
    payload: { name?: string };
}) {
    const chartWidth = useChartWidth();
    if (chartWidth == null) return null;
    const label = payload.name ?? '';
    const labelOnLeft = x + width + 6 > chartWidth;
    return (
        <Layer key={`sankey-node-${index}`}>
            <Rectangle x={x} y={y} width={width} height={height} fill="var(--foreground)" fillOpacity={0.85} />
            {label ? (
                <text
                    x={labelOnLeft ? x - 6 : x + width + 6}
                    y={y + height / 2}
                    textAnchor={labelOnLeft ? 'end' : 'start'}
                    dominantBaseline="middle"
                    className="fill-foreground text-xs"
                >
                    {label}
                </text>
            ) : null}
        </Layer>
    );
}

export function dropOffPercent(previousCompleted: number, completed: number): number | null {
    if (previousCompleted <= 0) return null;
    if (completed >= previousCompleted) return null;
    return Math.round(((previousCompleted - completed) / previousCompleted) * 100);
}

export function sequentialDropOff(
    step: AdminAnalyticsFunnelStep,
    index: number,
    steps: readonly AdminAnalyticsFunnelStep[],
): number | null {
    const previous = steps[index - 1];
    if (previous == null) return null;
    return dropOffPercent(previous.completedCount, step.completedCount);
}

function sankeyFromFlow(flow: AdminAnalyticsFunnelFlow) {
    if (!flow || flow.links.length === 0) return null;
    const indexById = new Map(flow.nodes.map((node, index) => [node.id, index]));
    const nodes = flow.nodes.map((node) => ({
        name: node.label,
    }));
    const links = flow.links
        .map((link) => {
            const source = indexById.get(link.source);
            const target = indexById.get(link.target);
            if (source == null || target == null) return null;
            return { source, target, value: link.value };
        })
        .filter((link): link is { source: number; target: number; value: number } => link != null);
    if (links.length === 0) return null;
    return { nodes, links };
}

export function AdminAnalyticsFunnelBlock({
    title,
    description,
    steps,
    showReachedColumn,
    reachedDisplay,
    dropOffForStep,
    flow,
    tableAriaLabel,
    sankeyAriaLabel,
    emptyCopy,
    children,
}: {
    title: string;
    description: string;
    steps: readonly AdminAnalyticsFunnelStep[];
    showReachedColumn: boolean;
    reachedDisplay: (step: AdminAnalyticsFunnelStep) => string | number;
    dropOffForStep: (step: AdminAnalyticsFunnelStep, index: number, steps: readonly AdminAnalyticsFunnelStep[]) => number | null;
    flow: AdminAnalyticsFunnelFlow;
    tableAriaLabel: string;
    sankeyAriaLabel: string;
    emptyCopy: string;
    children?: ReactNode;
}) {
    const locale = useLocale();
    const stepsWithActivity = steps.filter((step) => step.enteredCount > 0 || step.completedCount > 0);
    const sankeyData = sankeyFromFlow(flow);
    const [view, setView] = useState<'sankey' | 'table'>(sankeyData ? 'sankey' : 'table');

    return (
        <section className="grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="font-serif text-2xl text-foreground">{title}</h2>
                <Tabs
                    value={view}
                    onValueChange={(value) => {
                        if (value === 'sankey' || value === 'table') setView(value);
                    }}
                >
                    <TabsList variant="line" aria-label={t(locale, 'admin', 'analytics.funnelView.aria')}>
                        <TabsTrigger value="sankey">{t(locale, 'admin', 'analytics.funnelView.sankey')}</TabsTrigger>
                        <TabsTrigger value="table">{t(locale, 'admin', 'analytics.funnelView.table')}</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            {children}
            {view === 'table' ? (
                stepsWithActivity.length > 0 ? (
                    <Card>
                        <CardContent className="pt-4">
                            <Table aria-label={tableAriaLabel}>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t(locale, 'admin', 'copy.step')}</TableHead>
                                        {showReachedColumn ? (
                                            <TableHead className="text-right">{t(locale, 'admin', 'copy.reached')}</TableHead>
                                        ) : null}
                                        <TableHead className="text-right">{t(locale, 'admin', 'copy.completed2')}</TableHead>
                                        <TableHead className="text-right">{t(locale, 'admin', 'copy.dropOff')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stepsWithActivity.map((step, index) => {
                                        const dropOff = dropOffForStep(step, index, stepsWithActivity);
                                        return (
                                            <TableRow key={step.id}>
                                                <TableCell className="font-medium">{step.label}</TableCell>
                                                {showReachedColumn ? (
                                                    <TableCell className="text-right tabular-nums">{reachedDisplay(step)}</TableCell>
                                                ) : null}
                                                <TableCell className="text-right tabular-nums">{step.completedCount}</TableCell>
                                                <TableCell className="text-right tabular-nums text-muted-foreground">
                                                    {dropOff == null ? '-' : `${dropOff}%`}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ) : (
                    <p className="text-sm text-muted-foreground">{emptyCopy}</p>
                )
            ) : sankeyData ? (
                <Card>
                    <CardContent className="pt-4">
                        <div className="w-full" style={{ height: SANKEY_HEIGHT }} aria-label={sankeyAriaLabel}>
                            <ResponsiveContainer
                                width="100%"
                                height={SANKEY_HEIGHT}
                                initialDimension={{ width: 640, height: SANKEY_HEIGHT }}
                            >
                                <Sankey
                                    data={sankeyData}
                                    nodePadding={24}
                                    margin={{ top: 12, right: 160, bottom: 12, left: 12 }}
                                    link={{ stroke: 'var(--foreground)', strokeOpacity: 0.2 }}
                                    node={AdminAnalyticsSankeyNode}
                                >
                                    <Tooltip />
                                </Sankey>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <p className="text-sm text-muted-foreground">{emptyCopy}</p>
            )}
        </section>
    );
}
