import { useNavigate } from '@tanstack/react-router';
import { HandshakeIcon, PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { formatDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import type { GqlCAdminPartnersPageQuery } from '../../graphql/generated';
import { AdminPartnersPageUpdatesDocument, AdminPartnerUpsertDocument } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { AdminOverviewListCardLink } from './AdminOverviewListCard';

export const adminPartnersPageTitle = { de: 'Partner', en: 'Partners' } as const;
export const adminPartnersPageDescription = {
    de: 'Partnerseiten verwalten.',
    en: 'Manage partner landing pages.',
} as const;

export function AdminPartnersPage({ data }: { data: GqlCAdminPartnersPageQuery }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate();
    const client = useClient();
    const seed = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState(seed);
    const [, upsert] = useMutation(AdminPartnerUpsertDocument);
    const [busy, setBusy] = useState(false);
    const [draftQ, setDraftQ] = useState('');
    const debouncedQ = useDebouncedValue(draftQ, 300);

    useEffect(() => {
        if (!seed) return;
        const request = createRequest(AdminPartnersPageUpdatesDocument, {});
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                if (result.data?.adminUpdates) setAdmin(result.data.adminUpdates);
            }),
        );
        return unsubscribe;
    }, [client, seed]);

    const partners = admin?.partners ?? [];
    const q = debouncedQ.trim().toLowerCase();
    const filteredPartners = q
        ? partners.filter(
              (partner) =>
                  partner.name.toLowerCase().includes(q) ||
                  partner.pathName.toLowerCase().includes(q) ||
                  partner.titleDe.toLowerCase().includes(q) ||
                  partner.titleEn.toLowerCase().includes(q),
          )
        : partners;

    async function createPartner() {
        setBusy(true);
        try {
            const result = await upsert({
                input: {
                    pathName: `partner-${Date.now()}`,
                    name: 'Neuer Partner',
                    titleDe: 'Partner mit peopleeat',
                    titleEn: '',
                    descriptionDe: 'Beschreibung',
                    descriptionEn: '',
                    headlineDe: 'Gemeinsam genießen',
                    headlineEn: '',
                    subHeadlineDe: 'Exklusive Kooperation',
                    subHeadlineEn: '',
                    firstSectionHeadlineDe: '',
                    firstSectionHeadlineEn: '',
                    firstSectionBodyDe: '',
                    firstSectionBodyEn: '',
                    heroImageOverlay: true,
                    firstSectionImageOverlay: true,
                    howItWorksAlternativeMedia: false,
                    sections: [],
                    publishedAt: null,
                },
            });
            const id = result.data?.admin.partnerUpsert.referenceId;
            if (!id || result.error) throw new Error('create failed');
            await navigate({ to: '/{-$locale}/admin/partners/$partnerId', params: { partnerId: id } });
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
                            <HandshakeIcon className="size-8 text-muted-foreground" aria-hidden />
                            {adminPartnersPageTitle[locale]}
                        </h1>
                        <p className="text-muted-foreground">{adminPartnersPageDescription[locale]}</p>
                    </div>
                    <Button type="button" disabled={busy} onClick={() => void createPartner()}>
                        <PlusIcon className="size-4" />
                        {{ de: 'Neuer Partner', en: 'New partner' }[locale]}
                    </Button>
                </div>
                <Input
                    type="search"
                    value={draftQ}
                    onChange={(event) => setDraftQ(event.target.value)}
                    placeholder={{ de: 'Name oder Pfad suchen…', en: 'Search name or path…' }[locale]}
                    aria-label={{ de: 'Partner suchen', en: 'Search partners' }[locale]}
                    className="max-w-sm"
                />
                {partners.length === 0 ? (
                    <p className="text-muted-foreground">{{ de: 'Noch keine Partner.', en: 'No partners yet.' }[locale]}</p>
                ) : filteredPartners.length === 0 ? (
                    <p className="text-muted-foreground">{{ de: 'Keine Treffer.', en: 'No matches.' }[locale]}</p>
                ) : (
                    <ul className="grid gap-2">
                        {filteredPartners.map((partner) => (
                            <li key={partner.partnerId}>
                                <AdminOverviewListCardLink
                                    to="/{-$locale}/admin/partners/$partnerId"
                                    params={{ partnerId: partner.partnerId }}
                                    title={
                                        <>
                                            {partner.name}
                                            <Badge variant="outline">
                                                {partner.publishedAt
                                                    ? { de: 'Veröffentlicht', en: 'Published' }[locale]
                                                    : { de: 'Entwurf', en: 'Draft' }[locale]}
                                            </Badge>
                                        </>
                                    }
                                    description={`/${partner.pathName}`}
                                    meta={formatDate(new Date(partner.updatedAt), { locale, timeZone })}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </AdminPathPageChrome>
    );
}
