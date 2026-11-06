import { useNavigate } from '@tanstack/react-router';
import { PackagePlusIcon, PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { formatDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import type { GqlCAdminOfferAddonTemplatesPageQuery } from '../../graphql/generated';
import { AdminOfferAddonTemplatesPageUpdatesDocument, AdminOfferAddonTemplatesPageUpsertDocument } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { offerAddonPriceLabel } from '../../utils/offerAddonPriceLabel';
import { AdminOverviewListCardLink } from './AdminOverviewListCard';

export const adminOfferAddonTemplatesPageTitle = { de: 'Zusatzleistungen', en: 'Offer extras' } as const;
export const adminOfferAddonTemplatesPageDescription = {
    de: 'Vorlagen, die Köche in ihre Bibliothek übernehmen können.',
    en: 'Templates cooks can add to their library.',
} as const;

export function AdminOfferAddonTemplatesPage({ data }: { data: GqlCAdminOfferAddonTemplatesPageQuery }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate();
    const client = useClient();
    const seed = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState(seed);

    useEffect(() => {
        setAdmin((previous) => (Object.is(previous, seed) ? previous : seed));
    }, [seed]);
    const [, upsert] = useMutation(AdminOfferAddonTemplatesPageUpsertDocument);
    const [busy, setBusy] = useState(false);
    const [draftQ, setDraftQ] = useState('');
    const debouncedQ = useDebouncedValue(draftQ, 300);

    useEffect(() => {
        if (!seed) return;
        const request = createRequest(AdminOfferAddonTemplatesPageUpdatesDocument, {});
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                if (result.data?.adminUpdates) setAdmin(result.data.adminUpdates);
            }),
        );
        return unsubscribe;
    }, [client, seed]);

    const templates = (admin?.offerAddonTemplates ?? [])
        .slice()
        .sort((a, b) => a.position - b.position || a.titleDe.localeCompare(b.titleDe, locale));
    const q = debouncedQ.trim().toLowerCase();
    const filteredTemplates = q
        ? templates.filter((template) => template.titleDe.toLowerCase().includes(q) || template.titleEn.toLowerCase().includes(q))
        : templates;

    async function createTemplate() {
        setBusy(true);
        try {
            const result = await upsert({
                input: {
                    titleDe: 'Neue Zusatzleistung',
                    titleEn: 'New extra',
                    descriptionDe: '',
                    descriptionEn: '',
                    pricingUnit: 'FLAT',
                    suggestedPriceCents: 0,
                    position: templates.length,
                    publishedAt: null,
                },
            });
            const id = result.data?.admin.offerAddonTemplateUpsert.referenceId;
            if (!id || result.error || !result.data?.admin.offerAddonTemplateUpsert.success) {
                throw new Error('create failed');
            }
            await navigate({
                to: '/{-$locale}/admin/offer-addon-templates/$offerAddonTemplateId',
                params: { offerAddonTemplateId: id },
            });
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
                            <PackagePlusIcon className="size-8 text-muted-foreground" aria-hidden />
                            {adminOfferAddonTemplatesPageTitle[locale]}
                        </h1>
                        <p className="text-muted-foreground">{adminOfferAddonTemplatesPageDescription[locale]}</p>
                    </div>
                    <Button type="button" disabled={busy} onClick={() => void createTemplate()}>
                        <PlusIcon className="size-4" />
                        {{ de: 'Neue Vorlage', en: 'New template' }[locale]}
                    </Button>
                </div>
                <Input
                    type="search"
                    value={draftQ}
                    onChange={(event) => setDraftQ(event.target.value)}
                    placeholder={{ de: 'Titel suchen…', en: 'Search title…' }[locale]}
                    aria-label={{ de: 'Zusatzleistungen suchen', en: 'Search offer extras' }[locale]}
                    className="max-w-sm"
                />
                {templates.length === 0 ? (
                    <p className="text-muted-foreground">{{ de: 'Noch keine Vorlagen.', en: 'No templates yet.' }[locale]}</p>
                ) : filteredTemplates.length === 0 ? (
                    <p className="text-muted-foreground">{{ de: 'Keine Treffer.', en: 'No matches.' }[locale]}</p>
                ) : (
                    <ul className="grid gap-2">
                        {filteredTemplates.map((template) => (
                            <li key={template.offerAddonTemplateId}>
                                <AdminOverviewListCardLink
                                    to="/{-$locale}/admin/offer-addon-templates/$offerAddonTemplateId"
                                    params={{ offerAddonTemplateId: template.offerAddonTemplateId }}
                                    title={
                                        <>
                                            {template.titleDe}
                                            <Badge variant="outline">
                                                {template.publishedAt
                                                    ? { de: 'Veröffentlicht', en: 'Published' }[locale]
                                                    : { de: 'Entwurf', en: 'Draft' }[locale]}
                                            </Badge>
                                        </>
                                    }
                                    description={`${template.titleEn} · ${offerAddonPriceLabel(template.suggestedPriceCents, template.pricingUnit, locale)}`}
                                    meta={formatDate(new Date(template.updatedAt), { locale, timeZone })}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </AdminPathPageChrome>
    );
}
