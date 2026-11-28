import { useForm, useSelector } from '@tanstack/react-form';
import { Link } from '@tanstack/react-router';
import { SparklesIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import { webPageKeyIsTracked } from '../../../shared/webPage';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Button } from '../../components/base/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '../../components/base/card';
import { Input } from '../../components/base/input';
import { Spinner } from '../../components/base/spinner';
import { StatusBadge } from '../../components/base/status-badge';
import { Textarea } from '../../components/base/textarea';
import type { GqlCAdminWebPagePageQuery, GqlCLocale, GqlCWebPageKey } from '../../graphql/generated';
import { AdminWebPagePageUpdatesDocument, AdminWebPageSeoTranslateDocument, AdminWebPageUpsertDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';
import { AdminOverviewLineChart } from './AdminOverviewLineChart';
import { adminOverviewRangeToGraphQlVariables } from './adminOverviewRange';
import { adminTrafficRangeLastDays } from './adminTrafficSearch';
import { adminWebPageLabel } from './adminWebPages';

export function adminWebPagePageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.webPage.title');
}
export function adminWebPagePageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.webPage.description');
}

function adminWebPagePageRange(now = new Date()) {
    return adminTrafficRangeLastDays(90, now);
}

export function adminWebPagePageVariables(webPageKey: GqlCWebPageKey, now = new Date()) {
    const dates = adminWebPagePageRange(now);
    return {
        webPageKey,
        range: adminOverviewRangeToGraphQlVariables(dates).range,
        granularity: 'week' as const,
    };
}

type WebPageRow = NonNullable<NonNullable<GqlCAdminWebPagePageQuery['currentSession']['user']>['admin']>['webPage'];

type EditorValues = {
    titleDe: string;
    titleEn: string;
    titleNl: string;
    descriptionDe: string;
    descriptionEn: string;
    descriptionNl: string;
};

type TranslateLocale = Extract<GqlCLocale, 'en' | 'nl'>;

function valuesFromWebPage(webPage: WebPageRow): EditorValues {
    return {
        titleDe: webPage.titleDe,
        titleEn: webPage.titleEn,
        titleNl: webPage.titleNl,
        descriptionDe: webPage.descriptionDe,
        descriptionEn: webPage.descriptionEn,
        descriptionNl: webPage.descriptionNl,
    };
}

function fieldIsEmpty(value: string): boolean {
    return value.trim().length === 0;
}

export function AdminWebPagePage({ data, webPageKey }: { data: GqlCAdminWebPagePageQuery; webPageKey: GqlCWebPageKey }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const seedWebPage = seedAdmin?.webPage;
    if (!seedWebPage) throw new Error('AdminWebPagePage: expected webPage from loader');

    const [webPage, setWebPage] = useState(seedWebPage);
    const [persisted, setPersisted] = useState(seedWebPage.persisted);
    const [translatingLocale, setTranslatingLocale] = useState<TranslateLocale | null>(null);
    const [defaultValues] = useState(() => valuesFromWebPage(seedWebPage));
    const [, update] = useMutation(AdminWebPageUpsertDocument);
    const [, translate] = useMutation(AdminWebPageSeoTranslateDocument);
    const trafficRange = adminWebPagePageRange();
    const traffic = seedAdmin?.webPageVisitTraffic ?? null;
    const showTraffic = webPageKeyIsTracked(webPageKey);

    const form = useForm({
        defaultValues,
        onSubmit: async ({ value }) => {
            const result = await update({
                webPageKey,
                input: {
                    titleDe: value.titleDe,
                    titleEn: value.titleEn,
                    titleNl: value.titleNl,
                    descriptionDe: value.descriptionDe,
                    descriptionEn: value.descriptionEn,
                    descriptionNl: value.descriptionNl,
                },
            });
            if (!result.data?.admin.webPageUpsert.success || result.error) {
                toast.error(t(locale, 'admin', 'copy.couldNotSave'));
                return;
            }
            toast.success(t(locale, 'admin', 'copy.saved'));
            form.reset(value);
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const isDirty = useSelector(form.store, (state) => state.isDirty);
    const values = useSelector(form.store, (state) => state.values);
    const germanReady = !fieldIsEmpty(values.titleDe) && !fieldIsEmpty(values.descriptionDe);

    useEffect(() => {
        const request = createRequest(AdminWebPagePageUpdatesDocument, { webPageKey });
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const next = result.data?.adminUpdates.webPage;
                if (next) {
                    setWebPage(next);
                    setPersisted(next.persisted);
                }
            }),
        );
        return unsubscribe;
    }, [client, webPageKey]);

    useEffect(() => {
        if (!isDirty) {
            form.reset(valuesFromWebPage(webPage));
        }
    }, [form, isDirty, webPage]);

    async function onTranslate(target: TranslateLocale) {
        const titleKey = target === 'en' ? 'titleEn' : 'titleNl';
        const descriptionKey = target === 'en' ? 'descriptionEn' : 'descriptionNl';
        const titleEmpty = fieldIsEmpty(values[titleKey]);
        const descriptionEmpty = fieldIsEmpty(values[descriptionKey]);
        if (!germanReady || (!titleEmpty && !descriptionEmpty)) return;

        setTranslatingLocale(target);
        try {
            const result = await translate({
                webPageKey,
                locale: target,
                titleDe: values.titleDe,
                descriptionDe: values.descriptionDe,
            });
            const translation = result.data?.admin.webPageSeoTranslate;
            if (!translation || result.error) {
                throw new Error('translate failed');
            }
            if (titleEmpty) form.setFieldValue(titleKey, translation.title);
            if (descriptionEmpty) form.setFieldValue(descriptionKey, translation.description);
        } catch {
            toast.error(t(locale, 'admin', 'copy.couldNotTranslate'));
        } finally {
            setTranslatingLocale(null);
        }
    }

    const chartSeries = [
        {
            dataKey: webPageKey,
            label: adminWebPageLabel(webPageKey, locale),
            color: 'var(--chart-1)',
        },
    ];
    const chartData = (traffic?.series[0]?.buckets ?? []).map((bucket) => ({
        bucketStart: bucket.bucketStart,
        [webPageKey]: bucket.count,
    }));

    return (
        <AdminPageChrome
            crumbs={[
                { label: t(locale, 'admin', 'copy.websites'), to: '/{-$locale}/admin/web-pages' },
                { label: adminWebPageLabel(webPageKey, locale) },
            ]}
        >
            <AdminPinnedFooterLayout
                contentClassName="flex max-w-2xl flex-col gap-6"
                footer={
                    isDirty ? (
                        <Button type="submit" form="admin-web-page-form" disabled={isSubmitting}>
                            {isSubmitting ? t(locale, 'admin', 'copy.saving2') : t(locale, 'admin', 'copy.save')}
                        </Button>
                    ) : undefined
                }
            >
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-medium">{adminWebPageLabel(webPageKey, locale)}</h1>
                        {!persisted ? <StatusBadge tone="info">{t(locale, 'admin', 'copy.notConfigured')}</StatusBadge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{adminWebPagePageDescription(locale)}</p>
                </div>
                {showTraffic ? (
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <div>
                                <h2 className="text-sm font-medium">{t(locale, 'admin', 'traffic.last90Days')}</h2>
                                <p className="text-sm text-muted-foreground">
                                    {t(locale, 'admin', 'traffic.visits90d', { count: traffic?.pageviews ?? 0 })}
                                </p>
                            </div>
                            <Link
                                to="/{-$locale}/admin/traffic"
                                search={{
                                    keys: webPageKey,
                                    from: trafficRange.from,
                                    to: trafficRange.to,
                                    granularity: 'week',
                                }}
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
                            series={chartSeries}
                        />
                    </div>
                ) : null}
                <form
                    id="admin-web-page-form"
                    className="flex flex-col gap-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void form.handleSubmit();
                    }}
                >
                    {(
                        [
                            {
                                titleLabel: t(locale, 'admin', 'copy.german'),
                                titleName: 'titleDe',
                                descriptionName: 'descriptionDe',
                            },
                            {
                                titleLabel: t(locale, 'admin', 'copy.english'),
                                titleName: 'titleEn',
                                descriptionName: 'descriptionEn',
                                translateLocale: 'en' as const,
                            },
                            {
                                titleLabel: t(locale, 'admin', 'copy.dutch'),
                                titleName: 'titleNl',
                                descriptionName: 'descriptionNl',
                                translateLocale: 'nl' as const,
                            },
                        ] satisfies Array<{
                            titleLabel: string;
                            titleName: keyof EditorValues;
                            descriptionName: keyof EditorValues;
                            translateLocale?: TranslateLocale;
                        }>
                    ).map((card) => {
                        const targetLocale = card.translateLocale;
                        const translateEnabled =
                            targetLocale != null &&
                            germanReady &&
                            (fieldIsEmpty(values[card.titleName]) || fieldIsEmpty(values[card.descriptionName]));
                        const translating = targetLocale != null && translatingLocale === targetLocale;
                        return (
                            <Card key={card.titleName} className="gap-4 py-4">
                                <CardHeader className="px-4">
                                    <CardTitle>{card.titleLabel}</CardTitle>
                                    {translateEnabled && targetLocale ? (
                                        <CardAction>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={translating}
                                                onClick={() => void onTranslate(targetLocale)}
                                            >
                                                {translating ? (
                                                    <Spinner className="size-4" />
                                                ) : (
                                                    <SparklesIcon className="size-4" aria-hidden />
                                                )}
                                                {translating
                                                    ? t(locale, 'admin', 'copy.translating')
                                                    : t(locale, 'admin', 'copy.translateFromGerman')}
                                            </Button>
                                        </CardAction>
                                    ) : null}
                                </CardHeader>
                                <CardContent className="flex flex-col gap-3 px-4">
                                    <form.Field name={card.titleName}>
                                        {(field) => (
                                            <div className="flex flex-col gap-1.5">
                                                <label htmlFor={card.titleName} className="text-sm font-medium">
                                                    {t(locale, 'admin', 'copy.title')}
                                                </label>
                                                <Input
                                                    id={card.titleName}
                                                    name={field.name}
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(event) => field.handleChange(event.target.value)}
                                                />
                                            </div>
                                        )}
                                    </form.Field>
                                    <form.Field name={card.descriptionName}>
                                        {(field) => (
                                            <div className="flex flex-col gap-1.5">
                                                <label htmlFor={card.descriptionName} className="text-sm font-medium">
                                                    {t(locale, 'admin', 'copy.description')}
                                                </label>
                                                <Textarea
                                                    id={card.descriptionName}
                                                    name={field.name}
                                                    rows={4}
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(event) => field.handleChange(event.target.value)}
                                                />
                                            </div>
                                        )}
                                    </form.Field>
                                </CardContent>
                            </Card>
                        );
                    })}
                </form>
            </AdminPinnedFooterLayout>
        </AdminPageChrome>
    );
}
