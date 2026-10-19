import { useNavigate } from '@tanstack/react-router';
import type { DateRange } from 'react-day-picker';
import { Layer, Rectangle, ResponsiveContainer, Sankey, Tooltip, useChartWidth } from 'recharts';

import { formatIsoDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Card, CardContent } from '../../components/base/card';
import { DateRangePicker } from '../../components/base/date-range-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/base/table';
import type { GqlCAdminAnalyticsPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import { AdminOverviewBarChart } from './AdminOverviewBarChart';
import { adminOverviewRangeResolve, adminOverviewRangeToGraphQlVariables } from './adminOverviewRange';
import type { AdminOverviewRangeSearch } from './adminOverviewRange';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';

const SANKEY_HEIGHT = 384;

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

export const adminAnalyticsPageTitle = { de: 'Analysen', en: 'Analytics' } as const;
export const adminAnalyticsPageDescription = {
    de: 'Buchungsformular-, Geschenkkarten- und Koch-Funnels sowie Seitenbesuche.',
    en: 'Booking form, gift card, and chef funnels, plus page visits.',
} as const;

export function adminAnalyticsPageVariables(search: AdminOverviewRangeSearch = {}) {
    return {
        ...adminOverviewRangeToGraphQlVariables(adminOverviewRangeResolve(search)),
        formVisitWebPageKey: 'BOOKING_REQUEST_FORM' as const,
        landingVisitWebPageKey: 'LANDING' as const,
    };
}

function dropOffPercent(previousCompleted: number, completed: number): number | null {
    if (previousCompleted <= 0) return null;
    return Math.round(((previousCompleted - completed) / previousCompleted) * 100);
}

/** Parent step for cook-funnel drop-off (branches, not previous table row). */
const COOK_FUNNEL_DROP_OFF_PARENT: Record<string, string | null> = {
    notified: null,
    opened: 'notified',
    declined: 'opened',
    offer_create: 'opened',
    menus: 'offer_create',
    price: 'menus',
    created: 'price',
};

function cookFunnelDropOffPercent(
    stepId: string,
    completedCount: number,
    stepsById: Map<string, { completedCount: number }>,
): number | null {
    const parentId = COOK_FUNNEL_DROP_OFF_PARENT[stepId];
    if (parentId == null) return null;
    const parent = stepsById.get(parentId);
    if (parent == null) return null;
    return dropOffPercent(parent.completedCount, completedCount);
}

function sankeyFromFlow(
    flow:
        | {
              nodes: ReadonlyArray<{ id: string; labelDe: string; labelEn: string }>;
              links: ReadonlyArray<{ source: string; target: string; value: number }>;
          }
        | null
        | undefined,
    locale: 'de' | 'en',
) {
    if (!flow || flow.links.length === 0) return null;
    const indexById = new Map(flow.nodes.map((node, index) => [node.id, index]));
    const nodes = flow.nodes.map((node) => ({
        name: locale === 'de' ? node.labelDe : node.labelEn,
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

export function AdminAnalyticsPage({ data, search }: { data: GqlCAdminAnalyticsPageQuery; search: AdminOverviewRangeSearch }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/admin/analytics' });
    const range = adminOverviewRangeResolve(search);
    const admin = data.currentSession.user?.admin;
    const flow = admin?.bookingRequestFormFlow;
    const giftCardFlow = admin?.giftCardFlow;
    const chefSignUpFlow = admin?.chefSignUpFlow;
    const cookOfferFlow = admin?.cookBookingRequestOfferFlow;
    const formVisits = admin?.formVisits ?? [];
    const landingVisits = admin?.landingVisits ?? [];

    const formVisitCount = formVisits.reduce((sum, bucket) => sum + bucket.count, 0);
    const sessionsWithCompletion = flow?.sessionsWithCompletion ?? 0;
    const bookingRequestsCreated = flow?.bookingRequestsCreated ?? 0;
    const conversionPercent = formVisitCount > 0 ? Math.round((bookingRequestsCreated / formVisitCount) * 100) : null;

    const steps = flow?.steps ?? [];
    const stepsWithActivity = steps.filter((step) => step.enteredCount > 0 || step.completedCount > 0);
    const hasStepActivity = stepsWithActivity.length > 0;
    // Migrated traffic only has step_completed; hide the empty Reached column until live step_entered exists.
    const showReachedColumn = stepsWithActivity.some((step) => step.id !== 'created' && step.enteredCount > 0);

    const cookNotifiedCount = cookOfferFlow?.notifiedCount ?? 0;
    const cookOpenedCount = cookOfferFlow?.openedCount ?? 0;
    const cookDeclinedCount = cookOfferFlow?.declinedCount ?? 0;
    const cookOffersCreatedCount = cookOfferFlow?.offersCreatedCount ?? 0;
    const cookConversionPercent = cookNotifiedCount > 0 ? Math.round((cookOffersCreatedCount / cookNotifiedCount) * 100) : null;
    const cookSteps = cookOfferFlow?.steps ?? [];
    const cookStepsById = new Map(cookSteps.map((step) => [step.id, step]));
    const cookStepsWithActivity = cookSteps.filter((step) => step.enteredCount > 0 || step.completedCount > 0);
    const hasCookStepActivity = cookStepsWithActivity.length > 0;
    const showCookReachedColumn = cookStepsWithActivity.some(
        (step) =>
            step.enteredCount > 0 && step.id !== 'notified' && step.id !== 'opened' && step.id !== 'declined' && step.id !== 'created',
    );

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

    const sankeyData = sankeyFromFlow(flow, locale);
    const giftCardSankeyData = sankeyFromFlow(giftCardFlow, locale);
    const chefSignUpSankeyData = sankeyFromFlow(chefSignUpFlow, locale);
    const cookSankeyData = sankeyFromFlow(cookOfferFlow, locale);

    const giftCardSteps = giftCardFlow?.steps ?? [];
    const giftCardStepsWithActivity = giftCardSteps.filter((step) => step.enteredCount > 0 || step.completedCount > 0);
    const showGiftCardReachedColumn = giftCardStepsWithActivity.some(
        (step) => step.enteredCount > 0 && step.id !== 'created' && step.id !== 'paid',
    );
    const chefSignUpSteps = chefSignUpFlow?.steps ?? [];
    const chefSignUpStepsWithActivity = chefSignUpSteps.filter((step) => step.enteredCount > 0 || step.completedCount > 0);
    const showChefSignUpReachedColumn = chefSignUpStepsWithActivity.some((step) => step.enteredCount > 0 && step.id !== 'created');

    const sankeyEmptyCopy = (() => {
        if (hasStepActivity && flow && flow.nodes.length > 0 && flow.links.length === 0) {
            return {
                de: 'Keine Übergänge im Zeitraum (nur Einzelschritt-Sitzungen). Die Schritttabelle zeigt die Reichweite.',
                en: 'No transitions in this range (only single-step sessions). The step table shows reach.',
            }[locale];
        }
        if (formVisitCount > 0 && !hasStepActivity) {
            return {
                de: 'Noch keine strukturierten Funnel-Abschlüsse im Zeitraum. Seitenbesuche zählen alle Sitzungen; der Funnel nur menschliche Nicht-Admin-/Nicht-Koch-Sitzungen mit step_completed.',
                en: 'No structured funnel completions in this range yet. Visit charts count all sessions; the funnel only human non-admin/non-cook sessions with step_completed.',
            }[locale];
        }
        return {
            de: 'Keine Funnel-Daten im gewählten Zeitraum.',
            en: 'No funnel data in the selected range.',
        }[locale];
    })();

    const cookSankeyEmptyCopy = (() => {
        if (hasCookStepActivity && cookOfferFlow && cookOfferFlow.nodes.length > 0 && cookOfferFlow.links.length === 0) {
            return {
                de: 'Keine Übergänge im Zeitraum. Die Schritttabelle zeigt die Reichweite.',
                en: 'No transitions in this range. The step table shows reach.',
            }[locale];
        }
        return {
            de: 'Keine Koch-Angebots-Funnel-Daten im gewählten Zeitraum (Kohorte = benachrichtigte Köche).',
            en: 'No cook offer funnel data in the selected range (cohort = notified cooks).',
        }[locale];
    })();

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="grid gap-2">
                        <h1 className="font-serif text-4xl/tight text-foreground">{adminAnalyticsPageTitle[locale]}</h1>
                        <p className="text-muted-foreground">{adminAnalyticsPageDescription[locale]}</p>
                    </div>
                    <DateRangePicker
                        value={pickerValue}
                        onValueChange={onRangeChange}
                        locale={DATE_FNS_LOCALE[locale]}
                        placeholder={{ de: 'Zeitraum wählen', en: 'Pick a date range' }[locale]}
                        className="w-auto"
                        aria-label={{ de: 'Zeitraum für Analysen', en: 'Date range for analytics' }[locale]}
                    />
                </div>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Überblick', en: 'Overview' }[locale]}</h2>
                    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <AdminOverviewStatCard label={{ de: 'Formularbesuche', en: 'Form visits' }[locale]} value={formVisitCount} />
                        <AdminOverviewStatCard
                            label={{ de: 'Sitzungen mit Abschluss', en: 'Sessions with completion' }[locale]}
                            value={sessionsWithCompletion}
                        />
                        <AdminOverviewStatCard
                            label={{ de: 'Anfragen erstellt', en: 'Requests created' }[locale]}
                            value={bookingRequestsCreated}
                        />
                        <AdminOverviewStatCard label={{ de: 'Conversion %', en: 'Conversion %' }[locale]} value={conversionPercent ?? 0} />
                    </dl>
                    {conversionPercent == null && formVisitCount === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Conversion ist Besuch → Anfrage erstellt (0%, wenn keine Formularbesuche).',
                                    en: 'Conversion is visit → request created (0% when there are no form visits).',
                                }[locale]
                            }
                        </p>
                    ) : null}
                </section>

                <section className="grid gap-3">
                    <h2 className="font-serif text-2xl text-foreground">
                        {{ de: 'Buchungsformular-Funnel', en: 'Booking form funnel' }[locale]}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {
                            (showReachedColumn
                                ? {
                                      de: 'Menschliche Nicht-Admin-/Nicht-Koch-Sitzungen. Erreicht = Schritt betreten, Abgeschlossen = Schritt beendet, Ende = Anfrage erstellt.',
                                      en: 'Human non-admin/non-cook sessions. Reached = step entered, completed = step finished, end = request created.',
                                  }
                                : {
                                      de: 'Menschliche Nicht-Admin-/Nicht-Koch-Sitzungen. Abgeschlossen = Schritt beendet (inkl. migrierter Weiter-Klicks). Erreicht erscheint erst bei neuen step_entered-Ereignissen.',
                                      en: 'Human non-admin/non-cook sessions. Completed = step finished (including migrated Next clicks). Reached appears once live step_entered events exist.',
                                  })[locale]
                        }
                    </p>

                    {hasStepActivity ? (
                        <Card>
                            <CardContent className="pt-4">
                                <Table aria-label={{ de: 'Funnel-Schritte', en: 'Funnel steps' }[locale]}>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{{ de: 'Schritt', en: 'Step' }[locale]}</TableHead>
                                            {showReachedColumn ? (
                                                <TableHead className="text-right">{{ de: 'Erreicht', en: 'Reached' }[locale]}</TableHead>
                                            ) : null}
                                            <TableHead className="text-right">{{ de: 'Abgeschlossen', en: 'Completed' }[locale]}</TableHead>
                                            <TableHead className="text-right">{{ de: 'Abfall %', en: 'Drop-off %' }[locale]}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {stepsWithActivity.map((step, index) => {
                                            const previous = stepsWithActivity[index - 1];
                                            const dropOff =
                                                previous == null ? null : dropOffPercent(previous.completedCount, step.completedCount);
                                            return (
                                                <TableRow key={step.id}>
                                                    <TableCell className="font-medium">
                                                        {locale === 'de' ? step.labelDe : step.labelEn}
                                                    </TableCell>
                                                    {showReachedColumn ? (
                                                        <TableCell className="text-right tabular-nums">
                                                            {step.id === 'created' ? '-' : step.enteredCount}
                                                        </TableCell>
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
                    ) : null}

                    {sankeyData ? (
                        <Card>
                            <CardContent className="pt-4">
                                <div
                                    className="w-full"
                                    style={{ height: SANKEY_HEIGHT }}
                                    aria-label={{ de: 'Buchungsformular Sankey', en: 'Booking form Sankey' }[locale]}
                                >
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
                        <p className="text-sm text-muted-foreground">{sankeyEmptyCopy}</p>
                    )}
                </section>

                <section className="grid gap-3">
                    <h2 className="font-serif text-2xl text-foreground">
                        {{ de: 'Geschenkkarten-Funnel', en: 'Gift card funnel' }[locale]}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Menschliche Nicht-Admin-/Nicht-Koch-Sitzungen. Ende = Geschenkkarte bezahlt.',
                                en: 'Human non-admin/non-cook sessions. End = gift card paid.',
                            }[locale]
                        }
                    </p>
                    <dl className="grid gap-3 sm:grid-cols-2">
                        <AdminOverviewStatCard
                            label={{ de: 'Sitzungen mit Abschluss', en: 'Sessions with completion' }[locale]}
                            value={giftCardFlow?.sessionsWithCompletion ?? 0}
                        />
                        <AdminOverviewStatCard label={{ de: 'Bezahlt', en: 'Paid' }[locale]} value={giftCardFlow?.terminalCount ?? 0} />
                    </dl>
                    {giftCardStepsWithActivity.length > 0 ? (
                        <Card>
                            <CardContent className="pt-4">
                                <Table aria-label={{ de: 'Geschenkkarten-Schritte', en: 'Gift card steps' }[locale]}>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{{ de: 'Schritt', en: 'Step' }[locale]}</TableHead>
                                            {showGiftCardReachedColumn ? (
                                                <TableHead className="text-right">{{ de: 'Erreicht', en: 'Reached' }[locale]}</TableHead>
                                            ) : null}
                                            <TableHead className="text-right">{{ de: 'Abgeschlossen', en: 'Completed' }[locale]}</TableHead>
                                            <TableHead className="text-right">{{ de: 'Abfall %', en: 'Drop-off %' }[locale]}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {giftCardStepsWithActivity.map((step, index) => {
                                            const previous = giftCardStepsWithActivity[index - 1];
                                            const dropOff =
                                                previous == null ? null : dropOffPercent(previous.completedCount, step.completedCount);
                                            return (
                                                <TableRow key={step.id}>
                                                    <TableCell className="font-medium">
                                                        {locale === 'de' ? step.labelDe : step.labelEn}
                                                    </TableCell>
                                                    {showGiftCardReachedColumn ? (
                                                        <TableCell className="text-right tabular-nums">
                                                            {step.id === 'created' || step.id === 'paid' ? '-' : step.enteredCount}
                                                        </TableCell>
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
                    ) : null}
                    {giftCardSankeyData ? (
                        <Card>
                            <CardContent className="pt-4">
                                <div
                                    className="w-full"
                                    style={{ height: SANKEY_HEIGHT }}
                                    aria-label={{ de: 'Geschenkkarten Sankey', en: 'Gift card Sankey' }[locale]}
                                >
                                    <ResponsiveContainer
                                        width="100%"
                                        height={SANKEY_HEIGHT}
                                        initialDimension={{ width: 640, height: SANKEY_HEIGHT }}
                                    >
                                        <Sankey
                                            data={giftCardSankeyData}
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
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Keine Geschenkkarten-Funnel-Daten im gewählten Zeitraum.',
                                    en: 'No gift card funnel data in the selected range.',
                                }[locale]
                            }
                        </p>
                    )}
                </section>

                <section className="grid gap-3">
                    <h2 className="font-serif text-2xl text-foreground">
                        {{ de: 'Koch-Registrierungs-Funnel', en: 'Chef sign-up funnel' }[locale]}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Menschliche Nicht-Admin-Sitzungen (Köche eingeschlossen). Ende = Koch-Konto erstellt.',
                                en: 'Human non-admin sessions (cooks included). End = chef account created.',
                            }[locale]
                        }
                    </p>
                    <dl className="grid gap-3 sm:grid-cols-2">
                        <AdminOverviewStatCard
                            label={{ de: 'Sitzungen mit Abschluss', en: 'Sessions with completion' }[locale]}
                            value={chefSignUpFlow?.sessionsWithCompletion ?? 0}
                        />
                        <AdminOverviewStatCard
                            label={{ de: 'Koch-Konten erstellt', en: 'Chef accounts created' }[locale]}
                            value={chefSignUpFlow?.terminalCount ?? 0}
                        />
                    </dl>
                    {chefSignUpStepsWithActivity.length > 0 ? (
                        <Card>
                            <CardContent className="pt-4">
                                <Table aria-label={{ de: 'Koch-Registrierungs-Schritte', en: 'Chef sign-up steps' }[locale]}>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{{ de: 'Schritt', en: 'Step' }[locale]}</TableHead>
                                            {showChefSignUpReachedColumn ? (
                                                <TableHead className="text-right">{{ de: 'Erreicht', en: 'Reached' }[locale]}</TableHead>
                                            ) : null}
                                            <TableHead className="text-right">{{ de: 'Abgeschlossen', en: 'Completed' }[locale]}</TableHead>
                                            <TableHead className="text-right">{{ de: 'Abfall %', en: 'Drop-off %' }[locale]}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {chefSignUpStepsWithActivity.map((step, index) => {
                                            const previous = chefSignUpStepsWithActivity[index - 1];
                                            const dropOff =
                                                previous == null ? null : dropOffPercent(previous.completedCount, step.completedCount);
                                            return (
                                                <TableRow key={step.id}>
                                                    <TableCell className="font-medium">
                                                        {locale === 'de' ? step.labelDe : step.labelEn}
                                                    </TableCell>
                                                    {showChefSignUpReachedColumn ? (
                                                        <TableCell className="text-right tabular-nums">
                                                            {step.id === 'created' ? '-' : step.enteredCount}
                                                        </TableCell>
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
                    ) : null}
                    {chefSignUpSankeyData ? (
                        <Card>
                            <CardContent className="pt-4">
                                <div
                                    className="w-full"
                                    style={{ height: SANKEY_HEIGHT }}
                                    aria-label={{ de: 'Koch-Registrierung Sankey', en: 'Chef sign-up Sankey' }[locale]}
                                >
                                    <ResponsiveContainer
                                        width="100%"
                                        height={SANKEY_HEIGHT}
                                        initialDimension={{ width: 640, height: SANKEY_HEIGHT }}
                                    >
                                        <Sankey
                                            data={chefSignUpSankeyData}
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
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Keine Koch-Registrierungs-Funnel-Daten im gewählten Zeitraum.',
                                    en: 'No chef sign-up funnel data in the selected range.',
                                }[locale]
                            }
                        </p>
                    )}
                </section>

                <section className="grid gap-3">
                    <h2 className="font-serif text-2xl text-foreground">
                        {{ de: 'Koch-Angebots-Funnel', en: 'Cook offer funnel' }[locale]}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Kohorte: Köche mit Benachrichtigung im Zeitraum (ohne Admins). Abgelehnt und Angebot starten sind parallele Äste nach Geöffnet (Abfall % jeweils gegen den Elternschritt, nicht gegen die Zeile darüber). Menüs/Preis brauchen Live-Tracking auf der Angebotsseite.',
                                en: 'Cohort: cooks notified in range (excluding admins). Declined and Start offer are parallel branches after Opened (drop-off % is vs the parent step, not the row above). Menus/price need live tracking on the create page.',
                            }[locale]
                        }
                    </p>
                    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <AdminOverviewStatCard label={{ de: 'Benachrichtigt', en: 'Notified' }[locale]} value={cookNotifiedCount} />
                        <AdminOverviewStatCard label={{ de: 'Geöffnet', en: 'Opened' }[locale]} value={cookOpenedCount} />
                        <AdminOverviewStatCard label={{ de: 'Abgelehnt', en: 'Declined' }[locale]} value={cookDeclinedCount} />
                        <AdminOverviewStatCard
                            label={{ de: 'Angebote erstellt', en: 'Offers created' }[locale]}
                            value={cookOffersCreatedCount}
                        />
                    </dl>
                    {cookNotifiedCount > 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: `Conversion benachrichtigt → Angebot: ${cookConversionPercent ?? 0}%.`,
                                    en: `Conversion notified → offer: ${cookConversionPercent ?? 0}%.`,
                                }[locale]
                            }
                        </p>
                    ) : null}

                    {hasCookStepActivity ? (
                        <Card>
                            <CardContent className="pt-4">
                                <Table aria-label={{ de: 'Koch-Funnel-Schritte', en: 'Cook funnel steps' }[locale]}>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{{ de: 'Schritt', en: 'Step' }[locale]}</TableHead>
                                            {showCookReachedColumn ? (
                                                <TableHead className="text-right">{{ de: 'Erreicht', en: 'Reached' }[locale]}</TableHead>
                                            ) : null}
                                            <TableHead className="text-right">{{ de: 'Abgeschlossen', en: 'Completed' }[locale]}</TableHead>
                                            <TableHead className="text-right">{{ de: 'Abfall %', en: 'Drop-off %' }[locale]}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {cookStepsWithActivity.map((step) => {
                                            const dropOff = cookFunnelDropOffPercent(step.id, step.completedCount, cookStepsById);
                                            return (
                                                <TableRow key={step.id}>
                                                    <TableCell className="font-medium">
                                                        {locale === 'de' ? step.labelDe : step.labelEn}
                                                    </TableCell>
                                                    {showCookReachedColumn ? (
                                                        <TableCell className="text-right tabular-nums">
                                                            {step.enteredCount > 0 ? step.enteredCount : '-'}
                                                        </TableCell>
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
                    ) : null}

                    {cookSankeyData ? (
                        <Card>
                            <CardContent className="pt-4">
                                <div
                                    className="w-full"
                                    style={{ height: SANKEY_HEIGHT }}
                                    aria-label={{ de: 'Koch-Angebots Sankey', en: 'Cook offer Sankey' }[locale]}
                                >
                                    <ResponsiveContainer
                                        width="100%"
                                        height={SANKEY_HEIGHT}
                                        initialDimension={{ width: 640, height: SANKEY_HEIGHT }}
                                    >
                                        <Sankey
                                            data={cookSankeyData}
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
                        <p className="text-sm text-muted-foreground">{cookSankeyEmptyCopy}</p>
                    )}
                </section>

                <section className="grid gap-3">
                    <h2 className="font-serif text-2xl text-foreground">
                        {{ de: 'Seitenbesuche Formular', en: 'Form page visits' }[locale]}
                    </h2>
                    <AdminOverviewBarChart
                        data={formVisits}
                        locale={locale}
                        timeZone={timeZone}
                        ariaLabel={{ de: 'Besuche Buchungsformular', en: 'Booking form visits' }[locale]}
                    />
                </section>

                <section className="grid gap-3">
                    <h2 className="font-serif text-2xl text-foreground">
                        {{ de: 'Seitenbesuche Startseite', en: 'Landing page visits' }[locale]}
                    </h2>
                    <AdminOverviewBarChart
                        data={landingVisits}
                        locale={locale}
                        timeZone={timeZone}
                        ariaLabel={{ de: 'Besuche Startseite', en: 'Landing page visits' }[locale]}
                    />
                </section>
            </main>
        </AdminPathPageChrome>
    );
}
