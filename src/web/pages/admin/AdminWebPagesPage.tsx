import { MonitorIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

import { formatDate } from '../../../shared';
import { contentLocaleText } from '../../../shared/contentSection';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Input } from '../../components/base/input';
import { StatusBadge } from '../../components/base/status-badge';
import type { GqlCAdminWebPagesPageQuery } from '../../graphql/generated';
import { AdminWebPagesPageUpdatesDocument } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { AdminOverviewListCardLink } from './AdminOverviewListCard';
import { adminWebPageLabel } from './adminWebPages';

export const adminWebPagesPageTitle = { de: 'Webseiten', en: 'Websites' } as const;
export const adminWebPagesPageDescription = {
    de: 'SEO-Titel und -Beschreibungen der festen Seiten bearbeiten. Fehlende Einträge nutzen Standardwerte.',
    en: 'Edit SEO titles and descriptions for fixed pages. Missing entries use defaults.',
} as const;

export function AdminWebPagesPage({ data }: { data: GqlCAdminWebPagesPageQuery }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const client = useClient();
    const seed = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState(seed);
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
                        {adminWebPagesPageTitle[locale]}
                    </h1>
                    <p className="text-muted-foreground">{adminWebPagesPageDescription[locale]}</p>
                </div>
                <Input
                    type="search"
                    value={draftQ}
                    onChange={(event) => setDraftQ(event.target.value)}
                    placeholder={{ de: 'Seite oder Titel suchen…', en: 'Search page or title…' }[locale]}
                    aria-label={{ de: 'Webseiten suchen', en: 'Search websites' }[locale]}
                    className="max-w-sm"
                />
                {filteredWebPages.length === 0 ? (
                    <p className="text-muted-foreground">{{ de: 'Keine Treffer.', en: 'No matches.' }[locale]}</p>
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
                                                <StatusBadge tone="info">
                                                    {{ de: 'Nicht konfiguriert', en: 'Not configured' }[locale]}
                                                </StatusBadge>
                                            ) : null}
                                        </>
                                    }
                                    description={contentLocaleText(webPage.titleDe, webPage.titleEn, locale)}
                                    meta={
                                        webPage.persisted && webPage.updatedAt
                                            ? formatDate(new Date(webPage.updatedAt), { locale, timeZone })
                                            : undefined
                                    }
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </AdminPathPageChrome>
    );
}
