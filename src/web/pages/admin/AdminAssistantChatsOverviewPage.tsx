import { useNavigate } from '@tanstack/react-router';
import { BotMessageSquareIcon, ListIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { formatIsoDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { DateRangePicker } from '../../components/base/date-range-picker';
import type { GqlCAdminAssistantChatCriterion, GqlCAdminAssistantChatsOverviewPageQuery, GqlCChatSurface } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import { adminAssistantChatsSectionTo, adminChatSurfaceLabel } from './adminAssistantChats';
import { AdminOverviewBarChart } from './AdminOverviewBarChart';
import { AdminOverviewNavCard } from './AdminOverviewNavCard';
import { adminOverviewRangeResolve, adminOverviewRangeToGraphQlVariables } from './adminOverviewRange';
import type { AdminOverviewRangeSearch } from './adminOverviewRange';
import { AdminOverviewStatCard } from './AdminOverviewStatCard';

export const adminAssistantChatsOverviewPageTitle = { de: 'Assistent-Chats', en: 'Assistant chats' } as const;
export const adminAssistantChatsOverviewPageDescription = {
    de: 'Verteilung und Neuanlagen der Assistent-Chats.',
    en: 'Assistant chat distribution and creations.',
} as const;

/** Order matches `assistantChatsCounts` indices on the overview query. */
const ADMIN_ASSISTANT_CHAT_COUNT_CRITERIA: GqlCAdminAssistantChatCriterion[] = [
    {},
    { surface: 'admin' },
    { surface: 'customer' },
    { surface: 'cook' },
];

export function adminAssistantChatsOverviewPageVariables(search: AdminOverviewRangeSearch = {}) {
    return {
        criteria: ADMIN_ASSISTANT_CHAT_COUNT_CRITERIA,
        ...adminOverviewRangeToGraphQlVariables(adminOverviewRangeResolve(search)),
    };
}

function adminAssistantChatsListSearch(surface: GqlCChatSurface | undefined) {
    return {
        q: undefined,
        surface,
        page: undefined,
    };
}

export function AdminAssistantChatsOverviewPage({
    data,
    search,
}: {
    data: GqlCAdminAssistantChatsOverviewPageQuery;
    search: AdminOverviewRangeSearch;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/admin/assistant-chats' });
    const range = adminOverviewRangeResolve(search);
    const admin = data.currentSession.user?.admin;
    const [total = 0, adminSurface = 0, customer = 0, cook = 0] = admin?.assistantChatsCounts ?? [];
    const buckets = admin?.assistantChatCreations ?? [];

    const distribution: {
        key: string;
        label: string;
        value: number;
        surface: GqlCChatSurface | undefined;
    }[] = [
        {
            key: 'total',
            label: { de: 'Gesamt', en: 'Total' }[locale],
            value: total,
            surface: undefined,
        },
        {
            key: 'admin',
            label: adminChatSurfaceLabel('admin', locale),
            value: adminSurface,
            surface: 'admin',
        },
        {
            key: 'customer',
            label: adminChatSurfaceLabel('customer', locale),
            value: customer,
            surface: 'customer',
        },
        {
            key: 'cook',
            label: adminChatSurfaceLabel('cook', locale),
            value: cook,
            surface: 'cook',
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
                        <BotMessageSquareIcon className="size-8 text-muted-foreground" aria-hidden />
                        {adminAssistantChatsOverviewPageTitle[locale]}
                    </h1>
                    <p className="text-muted-foreground">{adminAssistantChatsOverviewPageDescription[locale]}</p>
                </div>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Bereiche', en: 'Sections' }[locale]}</h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        <li>
                            <AdminOverviewNavCard
                                to={adminAssistantChatsSectionTo('list')}
                                search={adminAssistantChatsListSearch(undefined)}
                                icon={ListIcon}
                            >
                                {{ de: 'Liste', en: 'List' }[locale]}
                            </AdminOverviewNavCard>
                        </li>
                    </ul>
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Verteilung', en: 'Distribution' }[locale]}</h2>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {distribution.map((entry) => (
                            <AdminOverviewStatCard
                                key={entry.key}
                                label={entry.label}
                                value={entry.value}
                                to={adminAssistantChatsSectionTo('list')}
                                search={adminAssistantChatsListSearch(entry.surface)}
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
                            aria-label={
                                {
                                    de: 'Zeitraum für Assistent-Chat-Neuanlagen',
                                    en: 'Date range for assistant chat creations',
                                }[locale]
                            }
                        />
                    </div>
                    <AdminOverviewBarChart
                        data={buckets.map((bucket) => ({ bucketStart: bucket.bucketStart, count: bucket.count }))}
                        locale={locale}
                        timeZone={timeZone}
                        ariaLabel={
                            {
                                de: 'Balkendiagramm der Assistent-Chat-Neuanlagen im gewählten Zeitraum',
                                en: 'Bar chart of assistant chat creations in the selected range',
                            }[locale]
                        }
                    />
                </section>
            </main>
        </AdminPathPageChrome>
    );
}
