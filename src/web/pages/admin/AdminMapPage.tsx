import { useNavigate } from '@tanstack/react-router';
import { parseISO } from 'date-fns';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { formatIsoDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Card, CardContent } from '../../components/base/card';
import { Checkbox } from '../../components/base/checkbox';
import { DateRangePicker } from '../../components/base/date-range-picker';
import type { GqlCAdminMapPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import { adminStubRouteBySlug } from './adminCatalog';
import type { AdminMapCoverageCook } from './AdminMapCanvas';
import { AdminMapCanvas } from './AdminMapCanvas';
import { AdminMapLocationSearch } from './AdminMapLocationSearch';
import type { AdminMapFocus, AdminMapLayer, AdminMapSearch } from './adminMapSearch';
import { ADMIN_MAP_LAYERS, adminMapSearchForUrl, adminMapSearchResolve } from './adminMapSearch';
import { AdminMapSelectionPanel } from './AdminMapSelectionPanel';

const route = adminStubRouteBySlug('map');

export const adminMapPageTitle = route.title;
export const adminMapPageDescription = route.description;

export { adminMapPageVariables, parseAdminMapSearch } from './adminMapSearch';

const LAYER_LABEL: Record<AdminMapLayer, { de: string; en: string }> = {
    cooks: { de: 'Köche', en: 'Cooks' },
    bookings: { de: 'Anfragen', en: 'Requests' },
    cities: { de: 'Städte', en: 'Cities' },
    venues: { de: 'Locations', en: 'Venues' },
};

type AdminMapPageProps = {
    data: GqlCAdminMapPageQuery;
    search: AdminMapSearch;
};

export function AdminMapPage({ data, search }: AdminMapPageProps) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/admin/map' });
    const resolved = adminMapSearchResolve(search);
    const mapPayload = data.currentSession.user?.admin?.map;
    const cooks = mapPayload?.cooks ?? [];
    const bookingRequests = mapPayload?.bookingRequests ?? [];
    const cities = mapPayload?.cities ?? [];
    const partnerVenues = mapPayload?.partnerVenues ?? [];
    const cooksMissingOriginCount = mapPayload?.cooksMissingOriginCount ?? 0;
    const partnerVenuesMissingLocationCount = mapPayload?.partnerVenuesMissingLocationCount ?? 0;

    const [coverageCooks, setCoverageCooks] = useState<readonly AdminMapCoverageCook[]>([]);

    const pickerValue: DateRange = {
        from: parseISO(resolved.range.from),
        to: parseISO(resolved.range.to),
    };

    function patchSearch(
        patch: Partial<{ range: { from: string; to: string }; layers: ReadonlySet<AdminMapLayer>; focus: AdminMapFocus | null }>,
    ) {
        const next = adminMapSearchForUrl({
            range: patch.range ?? resolved.range,
            layers: patch.layers ?? resolved.layers,
            focus: patch.focus === undefined ? resolved.focus : patch.focus,
        });
        void navigate({ search: next });
    }

    function onRangeChange(next: DateRange | undefined) {
        if (!next?.from || !next.to) return;
        patchSearch({
            range: {
                from: formatIsoDate(next.from),
                to: formatIsoDate(next.to),
            },
        });
    }

    function toggleLayer(layer: AdminMapLayer, enabled: boolean) {
        const next = new Set(resolved.layers);
        if (enabled) next.add(layer);
        else next.delete(layer);
        if (next.size === 0) return;
        patchSearch({ layers: next });
    }

    return (
        <AdminPathPageChrome contentClassName="relative min-h-0 gap-0 overflow-hidden px-3 pb-0 pt-0 sm:px-0 sm:pt-0">
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border bg-muted/30">
                <AdminMapCanvas
                    cooks={cooks}
                    bookingRequests={bookingRequests}
                    cities={cities}
                    partnerVenues={partnerVenues}
                    layers={resolved.layers}
                    focus={resolved.focus}
                    coverageCooks={coverageCooks}
                    onFocusChange={(focus) => patchSearch({ focus })}
                />

                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-2 p-3">
                    <div className="pointer-events-auto flex min-w-0 max-w-full flex-col items-stretch gap-2 sm:max-w-[20rem]">
                        <Card className="gap-0 py-0 shadow-md">
                            <CardContent className="p-2">
                                <AdminMapLocationSearch
                                    selected={resolved.focus?.kind === 'place' ? resolved.focus : null}
                                    onSelect={(place) => patchSearch({ focus: place })}
                                />
                            </CardContent>
                        </Card>
                        <Card className="gap-0 py-0 shadow-md">
                            <CardContent className="flex flex-wrap items-center gap-3 px-3 py-2">
                                {ADMIN_MAP_LAYERS.map((layer) => {
                                    const checked = resolved.layers.has(layer);
                                    return (
                                        <label key={layer} className="flex items-center gap-1.5 text-xs">
                                            <Checkbox checked={checked} onCheckedChange={(value) => toggleLayer(layer, value === true)} />
                                            {LAYER_LABEL[layer][locale]}
                                        </label>
                                    );
                                })}
                            </CardContent>
                        </Card>
                        {resolved.focus ? (
                            <AdminMapSelectionPanel
                                focus={resolved.focus}
                                cooks={cooks}
                                bookingRequests={bookingRequests}
                                cities={cities}
                                partnerVenues={partnerVenues}
                                onCoverageCooksChange={setCoverageCooks}
                                onClose={() => patchSearch({ focus: null })}
                            />
                        ) : null}
                    </div>

                    <div className="pointer-events-auto shrink-0">
                        <DateRangePicker
                            value={pickerValue}
                            onValueChange={onRangeChange}
                            locale={DATE_FNS_LOCALE[locale]}
                            placeholder={{ de: 'Zeitraum wählen', en: 'Pick a date range' }[locale]}
                            className="w-auto shadow-md"
                            aria-label={{ de: 'Zeitraum für Anfragen', en: 'Date range for requests' }[locale]}
                        />
                    </div>
                </div>

                <div className="pointer-events-none absolute bottom-3 left-3 z-10">
                    <Card className="pointer-events-auto gap-0 py-0 shadow-md">
                        <CardContent className="px-3 py-2 text-xs text-muted-foreground">
                            <span>
                                {{ de: 'Köche ohne Standort', en: 'Cooks missing origin' }[locale]}: {cooksMissingOriginCount}
                            </span>
                            <span className="mx-2 text-border">·</span>
                            <span>
                                {{ de: 'Locations ohne Standort', en: 'Venues missing location' }[locale]}:{' '}
                                {partnerVenuesMissingLocationCount}
                            </span>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminPathPageChrome>
    );
}
