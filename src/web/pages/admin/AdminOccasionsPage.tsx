import { useNavigate } from '@tanstack/react-router';
import { PartyPopperIcon, PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { formatDate, occasionFormatsSectionEmpty } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import type { GqlCAdminOccasionsPageQuery } from '../../graphql/generated';
import { AdminOccasionsPageUpdatesDocument, AdminOccasionUpsertDocument } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { AdminOverviewListCardLink } from './AdminOverviewListCard';

export const adminOccasionsPageTitle = { de: 'Anlässe', en: 'Occasions' } as const;
export const adminOccasionsPageDescription = {
    de: 'Anlassseiten verwalten.',
    en: 'Manage occasion landing pages.',
} as const;

export function AdminOccasionsPage({ data }: { data: GqlCAdminOccasionsPageQuery }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate();
    const client = useClient();
    const seed = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState(seed);
    const [, upsert] = useMutation(AdminOccasionUpsertDocument);
    const [busy, setBusy] = useState(false);
    const [draftQ, setDraftQ] = useState('');
    const debouncedQ = useDebouncedValue(draftQ, 300);

    useEffect(() => {
        if (!seed) return;
        const request = createRequest(AdminOccasionsPageUpdatesDocument, {});
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                if (result.data?.adminUpdates) setAdmin(result.data.adminUpdates);
            }),
        );
        return unsubscribe;
    }, [client, seed]);

    const occasions = admin?.occasions ?? [];
    const q = debouncedQ.trim().toLowerCase();
    const filteredOccasions = q
        ? occasions.filter(
              (occasion) =>
                  occasion.name.toLowerCase().includes(q) ||
                  occasion.pathName.toLowerCase().includes(q) ||
                  occasion.titleDe.toLowerCase().includes(q) ||
                  occasion.titleEn.toLowerCase().includes(q),
          )
        : occasions;

    async function createOccasion() {
        setBusy(true);
        try {
            const result = await upsert({
                input: {
                    pathName: `anlass-${Date.now()}`,
                    name: 'Neuer Anlass',
                    titleDe: 'Privatkoch für deinen Anlass',
                    titleEn: '',
                    descriptionDe: 'Beschreibung',
                    descriptionEn: '',
                    headlineDe: 'Unvergessliche Momente',
                    headlineEn: '',
                    subHeadlineDe: 'Für jeden Anlass',
                    subHeadlineEn: '',
                    firstSectionHeadlineDe: '',
                    firstSectionHeadlineEn: '',
                    firstSectionBodyDe: '',
                    firstSectionBodyEn: '',
                    formatsSection: occasionFormatsSectionEmpty(),
                    sections: [],
                    publishedAt: null,
                },
            });
            const id = result.data?.admin.occasionUpsert.referenceId;
            if (!id || result.error) throw new Error('create failed');
            await navigate({ to: '/{-$locale}/admin/occasions/$occasionId', params: { occasionId: id } });
        } catch {
            toast.error({ de: 'Anlegen fehlgeschlagen.', en: 'Could not create.' }[locale]);
        } finally {
            setBusy(false);
        }
    }

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-2">
                        <h1 className="flex items-center gap-3 font-serif text-4xl/tight text-foreground">
                            <PartyPopperIcon className="size-8 text-muted-foreground" aria-hidden />
                            {adminOccasionsPageTitle[locale]}
                        </h1>
                        <p className="text-muted-foreground">{adminOccasionsPageDescription[locale]}</p>
                    </div>
                    <Button type="button" disabled={busy} onClick={() => void createOccasion()}>
                        <PlusIcon className="size-4" />
                        {{ de: 'Neuer Anlass', en: 'New occasion' }[locale]}
                    </Button>
                </div>
                <Input
                    type="search"
                    value={draftQ}
                    onChange={(event) => setDraftQ(event.target.value)}
                    placeholder={{ de: 'Name oder Pfad suchen…', en: 'Search name or path…' }[locale]}
                    aria-label={{ de: 'Anlässe suchen', en: 'Search occasions' }[locale]}
                    className="max-w-sm"
                />
                {occasions.length === 0 ? (
                    <p className="text-muted-foreground">{{ de: 'Noch keine Anlässe.', en: 'No occasions yet.' }[locale]}</p>
                ) : filteredOccasions.length === 0 ? (
                    <p className="text-muted-foreground">{{ de: 'Keine Treffer.', en: 'No matches.' }[locale]}</p>
                ) : (
                    <ul className="grid gap-2">
                        {filteredOccasions.map((occasion) => (
                            <li key={occasion.occasionId}>
                                <AdminOverviewListCardLink
                                    to="/{-$locale}/admin/occasions/$occasionId"
                                    params={{ occasionId: occasion.occasionId }}
                                    title={
                                        <>
                                            {occasion.name}
                                            <Badge variant="outline">
                                                {occasion.publishedAt
                                                    ? { de: 'Veröffentlicht', en: 'Published' }[locale]
                                                    : { de: 'Entwurf', en: 'Draft' }[locale]}
                                            </Badge>
                                        </>
                                    }
                                    description={`/${occasion.pathName}`}
                                    meta={formatDate(new Date(occasion.updatedAt), { locale, timeZone })}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </AdminPathPageChrome>
    );
}
