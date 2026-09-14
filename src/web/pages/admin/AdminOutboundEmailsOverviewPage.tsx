import { useNavigate } from '@tanstack/react-router';
import { ListIcon, MailsIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { formatDateTime, formatIsoDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { DateRangePicker } from '../../components/base/date-range-picker';
import type {
    GqlCAdminOutboundEmailCriterion,
    GqlCAdminOutboundEmailLifecycleStatus,
    GqlCAdminOutboundEmailPurpose,
    GqlCAdminOutboundEmailsOverviewPageQuery,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import { adminOutboundEmailsSectionTo } from './adminOutboundEmails';
import { adminOutboundEmailLifecycleStatusLabel } from './adminOutboundEmailsColumns';
import { AdminOverviewBarChart } from './AdminOverviewBarChart';
import { AdminOverviewNavCard } from './AdminOverviewNavCard';
import { adminOverviewRangeResolve, adminOverviewRangeToGraphQlVariables } from './adminOverviewRange';
import type { AdminOverviewRangeSearch } from './adminOverviewRange';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';

export const adminOutboundEmailsOverviewPageTitle = { de: 'E-Mails', en: 'Emails' } as const;
export const adminOutboundEmailsOverviewPageDescription = {
    de: 'Resend-Kontingent, Zustellstatus und Neuanlagen ausgehender Transaktions-E-Mails.',
    en: 'Resend quota, delivery status, and outbound transactional email creations.',
} as const;

const ADMIN_OUTBOUND_EMAILS_ALL_PURPOSES: GqlCAdminOutboundEmailPurpose[] = [
    'GIFT_CARD_PURCHASED',
    'AUTH_EMAIL_OTP',
    'EMAIL_ADDRESS_UPDATE_CONFIRM',
    'CALL_SLOT_BOOKING_REQUEST',
    'CALL_SLOT_BOOKING_CONFIRM',
    'CALL_SLOT_BOOKING_DECLINE',
    'CALL_SLOT_BOOKING_CANCEL',
    'CALL_SLOT_BOOKING_REMINDER',
    'BOOKING_REQUEST_COOK_NOTIFY',
    'BOOKING_REQUEST_CREATED',
    'BOOKING_REQUEST_UPDATED',
    'BOOKING_REQUEST_CANCELED',
    'BOOKING_REQUEST_OFFER_CREATED',
    'BOOKING_REQUEST_OFFER_MENU_UPDATED',
    'BOOKING_REQUEST_OFFER_ACCEPTED',
    'BOOKING_REQUEST_OFFER_NOT_CHOSEN',
    'BOOKING_REQUEST_OFFER_DECLINED',
    'BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED',
    'BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT',
    'TESTIMONIAL_MEMORY_NUDGE_CUSTOMER',
    'TESTIMONIAL_MEMORY_NUDGE_COOK',
    'TESTIMONIAL_REMINDER_MORNING_CUSTOMER',
    'TESTIMONIAL_REMINDER_MORNING_COOK',
    'TESTIMONIAL_REMINDER_EVENING_CUSTOMER',
    'TESTIMONIAL_REMINDER_EVENING_COOK',
    'SUPPORT_REQUEST_CREATED',
    'SUPPORT_REQUEST_MESSAGE_FROM_ADMIN',
    'SUPPORT_REQUEST_RESOLVED',
    'BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_CUSTOMER',
    'BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_COOK',
    'COOK_APPROVED_BY_ADMIN',
];

/** Order matches `outboundEmailsCounts` indices on the overview query. */
const ADMIN_OUTBOUND_EMAIL_COUNT_CRITERIA: GqlCAdminOutboundEmailCriterion[] = [
    { purposes: [...ADMIN_OUTBOUND_EMAILS_ALL_PURPOSES] },
    { purposes: [...ADMIN_OUTBOUND_EMAILS_ALL_PURPOSES], lifecycleStatuses: ['FAILED'] },
    { purposes: [...ADMIN_OUTBOUND_EMAILS_ALL_PURPOSES], lifecycleStatuses: ['OPENED'] },
    { purposes: [...ADMIN_OUTBOUND_EMAILS_ALL_PURPOSES], lifecycleStatuses: ['BOUNCED'] },
    { purposes: [...ADMIN_OUTBOUND_EMAILS_ALL_PURPOSES], lifecycleStatuses: ['PENDING'] },
];

export function adminOutboundEmailsOverviewPageVariables(search: AdminOverviewRangeSearch = {}) {
    return {
        criteria: ADMIN_OUTBOUND_EMAIL_COUNT_CRITERIA,
        ...adminOverviewRangeToGraphQlVariables(adminOverviewRangeResolve(search)),
    };
}

function adminOutboundEmailsListSearch(lifecycleStatus: GqlCAdminOutboundEmailLifecycleStatus | undefined) {
    return {
        q: undefined,
        purpose: undefined,
        lifecycleStatus,
        page: undefined,
        sort: undefined,
        dir: undefined,
    };
}

function quotaPercent(used: number, limit: number | null | undefined): number | null {
    if (limit == null || limit <= 0) return null;
    return Math.min(100, Math.round((used / limit) * 100));
}

function ResendQuotaCard({
    title,
    used,
    limit,
    resetsAt,
    locale,
    timeZone,
}: {
    title: string;
    used: number;
    limit: number | null | undefined;
    resetsAt: string;
    locale: 'de' | 'en';
    timeZone: string;
}) {
    const percent = quotaPercent(used, limit);
    const limitLabel = limit == null ? { de: 'kein Limit', en: 'no limit' }[locale] : String(limit);

    return (
        <div className="grid gap-3 rounded-xl border border-border/60 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
                <p className="font-serif text-3xl/tight tabular-nums text-foreground">
                    {used}
                    <span className="text-lg text-muted-foreground"> / {limitLabel}</span>
                </p>
            </div>
            {percent != null ? (
                <div
                    className="h-2 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    aria-label={title}
                >
                    <div
                        className={`h-full rounded-full ${percent >= 80 ? 'bg-destructive' : 'bg-foreground'}`}
                        style={{ width: `${percent}%` }}
                    />
                </div>
            ) : null}
            <p className="text-sm text-muted-foreground">
                {
                    {
                        de: `Reset: ${formatDateTime(resetsAt, { locale, timeZone, dateStyle: 'medium', timeStyle: 'short' })}`,
                        en: `Resets: ${formatDateTime(resetsAt, { locale, timeZone, dateStyle: 'medium', timeStyle: 'short' })}`,
                    }[locale]
                }
                {percent != null ? ` · ${percent}%` : null}
            </p>
        </div>
    );
}

export function AdminOutboundEmailsOverviewPage({
    data,
    search,
}: {
    data: GqlCAdminOutboundEmailsOverviewPageQuery;
    search: AdminOverviewRangeSearch;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/admin/outbound-emails' });
    const range = adminOverviewRangeResolve(search);
    const admin = data.currentSession.user?.admin;
    const counts = admin?.outboundEmailsCounts ?? [];
    const buckets = admin?.outboundEmailCreations ?? [];
    const resendUsage = admin?.resendUsage ?? null;

    const distribution: {
        key: string;
        label: string;
        value: number;
        lifecycleStatus: GqlCAdminOutboundEmailLifecycleStatus | undefined;
    }[] = [
        { key: 'total', label: { de: 'Gesamt', en: 'Total' }[locale], value: counts[0] ?? 0, lifecycleStatus: undefined },
        {
            key: 'failed',
            label: adminOutboundEmailLifecycleStatusLabel('FAILED', locale),
            value: counts[1] ?? 0,
            lifecycleStatus: 'FAILED',
        },
        {
            key: 'opened',
            label: adminOutboundEmailLifecycleStatusLabel('OPENED', locale),
            value: counts[2] ?? 0,
            lifecycleStatus: 'OPENED',
        },
        {
            key: 'bounced',
            label: adminOutboundEmailLifecycleStatusLabel('BOUNCED', locale),
            value: counts[3] ?? 0,
            lifecycleStatus: 'BOUNCED',
        },
        {
            key: 'pending',
            label: adminOutboundEmailLifecycleStatusLabel('PENDING', locale),
            value: counts[4] ?? 0,
            lifecycleStatus: 'PENDING',
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
                        <MailsIcon className="size-8 text-muted-foreground" aria-hidden />
                        {adminOutboundEmailsOverviewPageTitle[locale]}
                    </h1>
                    <p className="text-muted-foreground">{adminOutboundEmailsOverviewPageDescription[locale]}</p>
                </div>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Resend-Kontingent', en: 'Resend quota' }[locale]}</h2>
                    {resendUsage ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <ResendQuotaCard
                                title={{ de: 'Monatlich', en: 'Monthly' }[locale]}
                                used={resendUsage.monthly.used}
                                limit={resendUsage.monthly.limit}
                                resetsAt={resendUsage.monthly.resetsAt}
                                locale={locale}
                                timeZone={timeZone}
                            />
                            {resendUsage.daily.limit != null ? (
                                <ResendQuotaCard
                                    title={{ de: 'Täglich', en: 'Daily' }[locale]}
                                    used={resendUsage.daily.used}
                                    limit={resendUsage.daily.limit}
                                    resetsAt={resendUsage.daily.resetsAt}
                                    locale={locale}
                                    timeZone={timeZone}
                                />
                            ) : null}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Kontingent nicht verfügbar (Konsolen-Transport oder Resend-API). Details bei Resend im Dashboard.',
                                    en: 'Quota unavailable (console transport or Resend API). Check the Resend dashboard for details.',
                                }[locale]
                            }{' '}
                            <a
                                href="https://resend.com"
                                target="_blank"
                                rel="noreferrer"
                                className="underline underline-offset-2 hover:text-foreground"
                            >
                                resend.com
                            </a>
                        </p>
                    )}
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Bereiche', en: 'Sections' }[locale]}</h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        <li>
                            <AdminOverviewNavCard
                                to={adminOutboundEmailsSectionTo('list')}
                                search={adminOutboundEmailsListSearch(undefined)}
                                icon={ListIcon}
                            >
                                {{ de: 'Liste', en: 'List' }[locale]}
                            </AdminOverviewNavCard>
                        </li>
                    </ul>
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Zustellung', en: 'Delivery' }[locale]}</h2>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {distribution.map((entry) => (
                            <AdminOverviewStatCard
                                key={entry.key}
                                label={entry.label}
                                value={entry.value}
                                to={adminOutboundEmailsSectionTo('list')}
                                search={adminOutboundEmailsListSearch(entry.lifecycleStatus)}
                            />
                        ))}
                    </dl>
                </section>

                <section className="grid gap-3">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <h2 className="text-lg font-medium">{{ de: 'Neuanlagen', en: 'Creations' }[locale]}</h2>
                        <DateRangePicker
                            value={pickerValue}
                            onValueChange={onRangeChange}
                            locale={DATE_FNS_LOCALE[locale]}
                            placeholder={{ de: 'Zeitraum wählen', en: 'Pick a date range' }[locale]}
                            className="w-auto"
                            aria-label={{ de: 'Zeitraum für E-Mails', en: 'Date range for emails' }[locale]}
                        />
                    </div>
                    <AdminOverviewBarChart
                        data={buckets.map((bucket) => ({ bucketStart: bucket.bucketStart, count: bucket.count }))}
                        locale={locale}
                        timeZone={timeZone}
                        ariaLabel={
                            {
                                de: 'Balkendiagramm der E-Mails im gewählten Zeitraum',
                                en: 'Bar chart of emails in the selected range',
                            }[locale]
                        }
                    />
                </section>
            </main>
        </AdminPathPageChrome>
    );
}
