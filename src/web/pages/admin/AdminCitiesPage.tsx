import { useNavigate } from '@tanstack/react-router';
import { Building2Icon, PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import type { CityCountryCode } from '../../../shared';
import { cityCountryCodeLabel, cityCountryCodes, formatDate } from '../../../shared';
import { AdminCityCenterField } from '../../components/AdminCityCenterField';
import type { CityCenterSelection } from '../../components/AdminCityCenterField';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/base/dialog';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import type { GqlCAdminCitiesPageQuery } from '../../graphql/generated';
import {
    AdminCitiesPageLocationSuggestionsDocument,
    AdminCitiesPageUpdatesDocument,
    AdminCityUpsertDocument,
} from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';
import { AdminOverviewListCardLink } from './AdminOverviewListCard';

export function adminCitiesPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'nav.cities.title');
}
export function adminCitiesPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.cities.description');
}

export type AdminCitiesSearch = {
    q?: string;
};

export function parseAdminCitiesSearch(search: Record<string, unknown>): AdminCitiesSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    return { q };
}

function adminCitiesSearchForUrl(search: AdminCitiesSearch): AdminCitiesSearch {
    return { q: search.q };
}

export function AdminCitiesPage({ data, search }: { data: GqlCAdminCitiesPageQuery; search: AdminCitiesSearch }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate({ from: '/{-$locale}/admin/cities' });
    const client = useClient();
    const seed = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState(seed);
    const [, upsert] = useMutation(AdminCityUpsertDocument);
    const [busy, setBusy] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [nameDe, setNameDe] = useState('Neue Stadt');
    const [countryCode, setCountryCode] = useState<CityCountryCode>('DE');
    const [center, setCenter] = useState<CityCenterSelection | null>(null);
    const [draftQ, setDraftQ] = useState(search.q ?? '');
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

    useEffect(() => {
        setDraftQ(search.q ?? '');
    }, [search.q]);

    useEffect(() => {
        const nextQ = debouncedQ.trim() || undefined;
        if (nextQ === search.q) return;
        void navigate({
            search: adminCitiesSearchForUrl({ q: nextQ }),
            replace: true,
        });
    }, [debouncedQ, navigate, search.q]);

    const cities = admin?.cities ?? [];
    const q = (search.q ?? '').toLowerCase();
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
            toast.error(t(locale, 'admin', 'copy.pleaseChooseACityCenter'));
            return;
        }
        const trimmedName = nameDe.trim();
        if (!trimmedName) {
            toast.error(t(locale, 'admin', 'copy.pleaseEnterACityName'));
            return;
        }
        setBusy(true);
        try {
            const result = await upsert({
                input: {
                    pathName: `stadt-${Date.now()}`,
                    nameDe: trimmedName,
                    nameEn: '',
                    countryCode,
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
            setCountryCode('DE');
            await navigate({ to: '/{-$locale}/admin/cities/$cityId', params: { cityId: id } });
        } catch {
            toast.error(t(locale, 'admin', 'copy.couldNotCreate'));
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
                            {adminCitiesPageTitle(locale)}
                        </h1>
                        <p className="text-muted-foreground">{adminCitiesPageDescription(locale)}</p>
                    </div>
                    <Button type="button" disabled={busy} onClick={() => setCreateOpen(true)}>
                        <PlusIcon className="size-4" />
                        {t(locale, 'admin', 'copy.newCity')}
                    </Button>
                </div>
                <Input
                    type="search"
                    value={draftQ}
                    onChange={(event) => setDraftQ(event.target.value)}
                    placeholder={t(locale, 'admin', 'copy.searchNameOrPath')}
                    aria-label={t(locale, 'admin', 'copy.searchCities')}
                    className="max-w-sm"
                />
                {cities.length === 0 ? (
                    <p className="text-muted-foreground">{t(locale, 'admin', 'copy.noCitiesYet')}</p>
                ) : filteredCities.length === 0 ? (
                    <p className="text-muted-foreground">{t(locale, 'admin', 'copy.noMatches')}</p>
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
                                            <Badge variant="outline">{cityCountryCodeLabel(city.countryCode, locale)}</Badge>
                                            <Badge variant="outline">
                                                {city.publishedAt
                                                    ? t(locale, 'admin', 'copy.published2')
                                                    : t(locale, 'admin', 'copy.draft')}
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
                        <DialogTitle>{t(locale, 'admin', 'copy.newCity')}</DialogTitle>
                        <DialogDescription>
                            {t(locale, 'admin', 'copy.setTheNameAndCityCenterYouCanEditTheRestAfterwards')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3">
                        <label className="flex flex-col gap-1.5 text-sm">
                            <span className="font-medium">{t(locale, 'admin', 'copy.nameDe')}</span>
                            <Input value={nameDe} onChange={(event) => setNameDe(event.target.value)} disabled={busy} />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm">
                            <span className="font-medium">{t(locale, 'admin', 'copy.country')}</span>
                            <Select value={countryCode} onValueChange={(value) => setCountryCode(value as CityCountryCode)} disabled={busy}>
                                <SelectTrigger aria-label={t(locale, 'admin', 'copy.country')}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {cityCountryCodes.map((code) => (
                                        <SelectItem key={code} value={code}>
                                            {cityCountryCodeLabel(code, locale)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                            {t(locale, 'admin', 'copy.cancel')}
                        </Button>
                        <Button type="button" disabled={busy} onClick={() => void createCity()}>
                            {t(locale, 'admin', 'copy.create')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminPathPageChrome>
    );
}
