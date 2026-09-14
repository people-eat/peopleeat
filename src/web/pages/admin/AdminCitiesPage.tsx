import { useNavigate } from '@tanstack/react-router';
import { Building2Icon, PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { formatDate } from '../../../shared';
import { AdminCityCenterField } from '../../components/AdminCityCenterField';
import type { CityCenterSelection } from '../../components/AdminCityCenterField';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/base/dialog';
import { Input } from '../../components/base/input';
import type { GqlCAdminCitiesPageQuery } from '../../graphql/generated';
import {
    AdminCitiesPageLocationSuggestionsDocument,
    AdminCitiesPageUpdatesDocument,
    AdminCityUpsertDocument,
} from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { AdminOverviewListCardLink } from './AdminOverviewListCard';

export const adminCitiesPageTitle = { de: 'Städte', en: 'Cities' } as const;
export const adminCitiesPageDescription = {
    de: 'Stadtseiten für SEO verwalten.',
    en: 'Manage city landing pages for SEO.',
} as const;

export function AdminCitiesPage({ data }: { data: GqlCAdminCitiesPageQuery }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate();
    const client = useClient();
    const seed = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState(seed);
    const [, upsert] = useMutation(AdminCityUpsertDocument);
    const [busy, setBusy] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [nameDe, setNameDe] = useState('Neue Stadt');
    const [center, setCenter] = useState<CityCenterSelection | null>(null);
    const [draftQ, setDraftQ] = useState('');
    const debouncedQ = useDebouncedValue(draftQ, 300);

    useEffect(() => {
        if (!seed) return;
        const request = createRequest(AdminCitiesPageUpdatesDocument, {});
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                if (result.data?.adminUpdates) setAdmin(result.data.adminUpdates);
            }),
        );
        return unsubscribe;
    }, [client, seed]);

    const cities = admin?.cities ?? [];
    const q = debouncedQ.trim().toLowerCase();
    const filteredCities = q
        ? cities.filter(
              (city) =>
                  city.nameDe.toLowerCase().includes(q) ||
                  city.nameEn.toLowerCase().includes(q) ||
                  city.pathName.toLowerCase().includes(q) ||
                  city.titleDe.toLowerCase().includes(q),
          )
        : cities;

    async function createCity() {
        if (!center) {
            toast.error({ de: 'Bitte ein Stadtzentrum wählen.', en: 'Please choose a city center.' }[locale]);
            return;
        }
        const trimmedName = nameDe.trim();
        if (!trimmedName) {
            toast.error({ de: 'Bitte einen Stadtnamen eingeben.', en: 'Please enter a city name.' }[locale]);
            return;
        }
        setBusy(true);
        try {
            const result = await upsert({
                input: {
                    pathName: `stadt-${Date.now()}`,
                    nameDe: trimmedName,
                    nameEn: '',
                    latitude: center.latitude,
                    longitude: center.longitude,
                    titleDe: `Privatkoch in ${trimmedName}`,
                    titleEn: '',
                    descriptionDe: 'Beschreibung',
                    descriptionEn: '',
                    headlineDe: 'Privatkoch buchen',
                    headlineEn: '',
                    subHeadlineDe: 'Für jeden Anlass',
                    subHeadlineEn: '',
                    firstSectionHeadlineDe: '',
                    firstSectionHeadlineEn: '',
                    firstSectionBodyDe: '',
                    firstSectionBodyEn: '',
                    sections: [],
                    publishedAt: null,
                },
            });
            const id = result.data?.admin.cityUpsert.referenceId;
            if (!id || result.error) throw new Error('create failed');
            setCreateOpen(false);
            setCenter(null);
            setNameDe('Neue Stadt');
            await navigate({ to: '/{-$locale}/admin/cities/$cityId', params: { cityId: id } });
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
                            <Building2Icon className="size-8 text-muted-foreground" aria-hidden />
                            {adminCitiesPageTitle[locale]}
                        </h1>
                        <p className="text-muted-foreground">{adminCitiesPageDescription[locale]}</p>
                    </div>
                    <Button type="button" disabled={busy} onClick={() => setCreateOpen(true)}>
                        <PlusIcon className="size-4" />
                        {{ de: 'Neue Stadt', en: 'New city' }[locale]}
                    </Button>
                </div>
                <Input
                    type="search"
                    value={draftQ}
                    onChange={(event) => setDraftQ(event.target.value)}
                    placeholder={{ de: 'Name oder Pfad suchen…', en: 'Search name or path…' }[locale]}
                    aria-label={{ de: 'Städte suchen', en: 'Search cities' }[locale]}
                    className="max-w-sm"
                />
                {cities.length === 0 ? (
                    <p className="text-muted-foreground">{{ de: 'Noch keine Städte.', en: 'No cities yet.' }[locale]}</p>
                ) : filteredCities.length === 0 ? (
                    <p className="text-muted-foreground">{{ de: 'Keine Treffer.', en: 'No matches.' }[locale]}</p>
                ) : (
                    <ul className="grid gap-2">
                        {filteredCities.map((city) => (
                            <li key={city.cityId}>
                                <AdminOverviewListCardLink
                                    to="/{-$locale}/admin/cities/$cityId"
                                    params={{ cityId: city.cityId }}
                                    title={
                                        <>
                                            {city.nameDe}
                                            <Badge variant="outline">
                                                {city.publishedAt
                                                    ? { de: 'Veröffentlicht', en: 'Published' }[locale]
                                                    : { de: 'Entwurf', en: 'Draft' }[locale]}
                                            </Badge>
                                        </>
                                    }
                                    description={`/${city.pathName}`}
                                    meta={formatDate(new Date(city.updatedAt), { locale, timeZone })}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </main>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{{ de: 'Neue Stadt', en: 'New city' }[locale]}</DialogTitle>
                        <DialogDescription>
                            {
                                {
                                    de: 'Name und Stadtzentrum festlegen. Weitere Inhalte kannst du danach bearbeiten.',
                                    en: 'Set the name and city center. You can edit the rest afterwards.',
                                }[locale]
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3">
                        <label className="flex flex-col gap-1.5 text-sm">
                            <span className="font-medium">{{ de: 'Name (DE)', en: 'Name (DE)' }[locale]}</span>
                            <Input value={nameDe} onChange={(event) => setNameDe(event.target.value)} disabled={busy} />
                        </label>
                        <AdminCityCenterField
                            locale={locale}
                            value={center}
                            onChange={setCenter}
                            suggestionsQuery={AdminCitiesPageLocationSuggestionsDocument}
                            disabled={busy}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" disabled={busy} onClick={() => setCreateOpen(false)}>
                            {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                        </Button>
                        <Button type="button" disabled={busy} onClick={() => void createCity()}>
                            {{ de: 'Anlegen', en: 'Create' }[locale]}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminPathPageChrome>
    );
}
