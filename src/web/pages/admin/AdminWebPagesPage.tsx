import { subDays } from 'date-fns';
import { MonitorIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import { formatDate, formatIsoDate } from '../../../shared';
import { contentLocaleText } from '../../../shared/contentSection';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Input } from '../../components/base/input';
import { StatusBadge } from '../../components/base/status-badge';
import type { GqlCAdminWebPagesPageQuery } from '../../graphql/generated';
import { AdminWebPagesPageUpdatesDocument } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';
import { AdminOverviewListCardLink } from './AdminOverviewListCard';
import { adminOverviewRangeToGraphQlVariables } from './adminOverviewRange';
import { adminWebPageLabel } from './adminWebPages';

export function adminWebPagesPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'nav.webPages.title');
}
export function adminWebPagesPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.webPages.description');
}

export function adminWebPagesPageVariables() {
    const to = new Date();
    const from = subDays(to, 30);
    return adminOverviewRangeToGraphQlVariables({
        from: formatIsoDate(from),
        to: formatIsoDate(to),
    });
}

export function AdminWebPagesPage({ data }: { data: GqlCAdminWebPagesPageQuery }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const client = useClient();
    const seed = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState(seed ? { adminId: seed.adminId, webPages: seed.webPages } : null);
    const [draftQ, setDraftQ] = useState('');
    const debouncedQ = useDebouncedValue(draftQ, 300);

    useEffect(() => {
        if (!seed) return;
        const request = createRequest(AdminWebPagesPageUpdatesDocument, {});
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                if (result.data?.adminUpdates) setAdmin(result.data.adminUpdates);
            }),
        );
        return unsubscribe;
    }, [client, seed]);

    const webPages = admin?.webPages ?? [];
    const visitCounts = new Map((seed?.webPageVisitCounts ?? []).map((row) => [row.webPageKey, row.pageviews]));
    const q = debouncedQ.trim().toLowerCase();
    const filteredWebPages = q
        ? webPages.filter((webPage) => {
              const label = adminWebPageLabel(webPage.webPageKey, locale).toLowerCase();
              return (
                  label.includes(q) ||
                  webPage.webPageKey.toLowerCase().includes(q) ||
                  webPage.titleDe.toLowerCase().includes(q) ||
                  webPage.titleEn.toLowerCase().includes(q)
              );
          })
        : webPages;

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="flex items-center gap-3 font-serif text-4xl/tight text-foreground">
                        <MonitorIcon className="size-8 text-muted-foreground" aria-hidden />
                        {adminWebPagesPageTitle(locale)}
                    </h1>
                    <p className="text-muted-foreground">{adminWebPagesPageDescription(locale)}</p>
                </div>
                <Input
                    type="search"
                    value={draftQ}
                    onChange={(event) => setDraftQ(event.target.value)}
                    placeholder={t(locale, 'admin', 'copy.searchPageOrTitle')}
                    aria-label={t(locale, 'admin', 'copy.searchWebsites')}
                    className="max-w-sm"
                />
                {filteredWebPages.length === 0 ? (
                    <p className="text-muted-foreground">{t(locale, 'admin', 'copy.noMatches')}</p>
                ) : (
                    <ul className="grid gap-2">
                        {filteredWebPages.map((webPage) => (
                            <li key={webPage.webPageKey}>
                                <AdminOverviewListCardLink
                                    to="/{-$locale}/admin/web-pages/$webPageKey"
                                    params={{ webPageKey: webPage.webPageKey }}
                                    title={
                                        <>
                                            {adminWebPageLabel(webPage.webPageKey, locale)}
                                            {!webPage.persisted ? (
                                                <StatusBadge tone="info">{t(locale, 'admin', 'copy.notConfigured')}</StatusBadge>
                                            ) : null}
                                        </>
                                    }
                                    description={contentLocaleText(webPage.titleDe, webPage.titleEn, locale)}
                                    meta={(() => {
                                        const visits = t(locale, 'admin', 'traffic.visits30d', {
                                            count: visitCounts.get(webPage.webPageKey) ?? 0,
                                        });
                                        const updated =
                                            webPage.persisted && webPage.updatedAt
                                                ? formatDate(new Date(webPage.updatedAt), { locale, timeZone })
                                                : null;
                                        return updated ? `${visits} · ${updated}` : visits;
                                    })()}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </AdminPathPageChrome>
    );
}
