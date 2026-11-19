import { useNavigate } from '@tanstack/react-router';
import { Building2Icon, PlusIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import type { CityCountryCode } from '../../../shared';
import { cityCountryCodeLabel, cityCountryCodes, formatDate, isCityCountryCode } from '../../../shared';
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

const ADMIN_CITIES_SORT_VALUES = ['name-asc', 'name-desc', 'created-desc', 'created-asc', 'updated-desc', 'updated-asc'] as const;

type AdminCitiesSort = (typeof ADMIN_CITIES_SORT_VALUES)[number];
const DEFAULT_ADMIN_CITIES_SORT: AdminCitiesSort = 'name-asc';

export type AdminCitiesSearch = {
    q?: string;
    country?: CityCountryCode;
    sort?: Exclude<AdminCitiesSort, typeof DEFAULT_ADMIN_CITIES_SORT>;
};

function parseAdminCitiesSort(value: unknown): AdminCitiesSearch['sort'] {
    if (typeof value !== 'string') return undefined;
    if (!(ADMIN_CITIES_SORT_VALUES as readonly string[]).includes(value)) return undefined;
    if (value === DEFAULT_ADMIN_CITIES_SORT) return undefined;
    return value as AdminCitiesSearch['sort'];
}

export function parseAdminCitiesSearch(search: Record<string, unknown>): AdminCitiesSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    const country = typeof search.country === 'string' && isCityCountryCode(search.country) ? search.country : undefined;
    return { q, country, sort: parseAdminCitiesSort(search.sort) };
}

function adminCitiesSearchForUrl(search: AdminCitiesSearch): AdminCitiesSearch {
    return { q: search.q, country: search.country, sort: search.sort };
}

function adminCitiesHasActiveFilters(search: AdminCitiesSearch): boolean {
    return search.q != null || search.country != null || search.sort != null;
}

type CityRow = NonNullable<NonNullable<NonNullable<GqlCAdminCitiesPageQuery['currentSession']['user']>['admin']>['cities']>[number];

function citiesFilteredSorted({ cities, search, locale }: { cities: CityRow[]; search: AdminCitiesSearch; locale: Locale }): CityRow[] {
    const q = (search.q ?? '').toLowerCase();
    const filtered = cities.filter((city) => {
        if (search.country != null && city.countryCode !== search.country) return false;
        if (!q) return true;
        return (
            city.nameDe.toLowerCase().includes(q) ||
            city.nameEn.toLowerCase().includes(q) ||
            city.pathName.toLowerCase().includes(q) ||
            city.titleDe.toLowerCase().includes(q)
        );
    });

    const sort: AdminCitiesSort = search.sort ?? DEFAULT_ADMIN_CITIES_SORT;
    const sorted = [...filtered];
    sorted.sort((a, b) => {
        switch (sort) {
            case 'name-desc':
                return b.nameDe.localeCompare(a.nameDe, locale) || b.cityId.localeCompare(a.cityId);
            case 'created-desc': {
                const delta = Date.parse(b.createdAt) - Date.parse(a.createdAt);
                return delta !== 0 ? delta : a.nameDe.localeCompare(b.nameDe, locale);
            }
            case 'created-asc': {
                const delta = Date.parse(a.createdAt) - Date.parse(b.createdAt);
                return delta !== 0 ? delta : a.nameDe.localeCompare(b.nameDe, locale);
            }
            case 'updated-desc': {
                const delta = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
                return delta !== 0 ? delta : a.nameDe.localeCompare(b.nameDe, locale);
            }
            case 'updated-asc': {
                const delta = Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
                return delta !== 0 ? delta : a.nameDe.localeCompare(b.nameDe, locale);
            }
            case 'name-asc':
            default:
                return a.nameDe.localeCompare(b.nameDe, locale) || a.cityId.localeCompare(b.cityId);
        }
    });
    return sorted;
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
    const searchRef = useRef(search);
    searchRef.current = search;

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
        const current = searchRef.current;
        const nextQ = debouncedQ.trim() || undefined;
        if (nextQ === current.q) return;
        void navigate({
            search: adminCitiesSearchForUrl({ ...current, q: nextQ }),
            replace: true,
        });
    }, [debouncedQ, navigate]);

    const cities = admin?.cities ?? [];
    const hasActiveFilters = adminCitiesHasActiveFilters(search) || draftQ.trim().length > 0;
    const filteredCities = citiesFilteredSorted({ cities, search, locale });

    function updateSearch(next: AdminCitiesSearch) {
        void navigate({
            search: adminCitiesSearchForUrl(next),
            replace: true,
        });
    }

    function clearFilters() {
        setDraftQ('');
        updateSearch({});
    }

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
                <div className="flex flex-wrap items-center gap-3">
                    <Input
                        type="search"
                        value={draftQ}
                        onChange={(event) => setDraftQ(event.target.value)}
                        placeholder={t(locale, 'admin', 'copy.searchNameOrPath')}
                        aria-label={t(locale, 'admin', 'copy.searchCities')}
                        className="max-w-sm"
                    />
                    <Select
                        value={search.country ?? 'all'}
                        onValueChange={(value) =>
                            updateSearch({
                                ...search,
                                country: value != null && isCityCountryCode(value) ? value : undefined,
                            })
                        }
                    >
                        <SelectTrigger size="sm" className="w-auto shrink-0" aria-label={t(locale, 'admin', 'copy.filterByCountry')}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t(locale, 'admin', 'copy.allCountries')}</SelectItem>
                            {cityCountryCodes.map((code) => (
                                <SelectItem key={code} value={code}>
                                    {cityCountryCodeLabel(code, locale)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={search.sort ?? DEFAULT_ADMIN_CITIES_SORT}
                        onValueChange={(value) =>
                            updateSearch({
                                ...search,
                                sort: parseAdminCitiesSort(value),
                            })
                        }
                    >
                        <SelectTrigger size="sm" className="w-auto shrink-0" aria-label={t(locale, 'admin', 'copy.sort')}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name-asc">{t(locale, 'admin', 'copy.nameAZ')}</SelectItem>
                            <SelectItem value="name-desc">{t(locale, 'admin', 'copy.nameZA')}</SelectItem>
                            <SelectItem value="created-desc">{t(locale, 'admin', 'copy.createdNewest')}</SelectItem>
                            <SelectItem value="created-asc">{t(locale, 'admin', 'copy.createdOldest')}</SelectItem>
                            <SelectItem value="updated-desc">{t(locale, 'admin', 'copy.lastModifiedNewest')}</SelectItem>
                            <SelectItem value="updated-asc">{t(locale, 'admin', 'copy.lastModifiedOldest')}</SelectItem>
                        </SelectContent>
                    </Select>
                    {hasActiveFilters ? (
                        <Button
                            type="button"
                            variant="link"
                            className="h-auto shrink-0 p-0 text-sm text-muted-foreground"
                            onClick={clearFilters}
                        >
                            {t(locale, 'admin', 'copy.clearFilters')}
                        </Button>
                    ) : null}
                    <p className="text-sm text-muted-foreground tabular-nums sm:ml-auto">
                        {t(locale, 'admin', 'copy.citiesVisibleOfTotal', {
                            visible: filteredCities.length,
                            total: cities.length,
                        })}
                    </p>
                </div>
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
