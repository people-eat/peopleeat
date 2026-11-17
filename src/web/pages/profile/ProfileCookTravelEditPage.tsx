import { useForm, useSelector } from '@tanstack/react-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useMutation, useQuery } from 'urql';

import { t } from '../../../i18n/t';
import type { Locale } from '../../../shared/locale';
import { Button } from '../../components/base/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../../components/base/combobox';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { CookTravelRadiusMap } from '../../components/CookTravelRadiusMap';
import { ProfilePinnedFooterLayout } from '../../components/ProfilePinnedFooterLayout';
import type { GqlCLocationSuggestion, GqlCProfileCookTravelPageQuery, GqlCProfileTravelCookFragment } from '../../graphql/generated';
import {
    ProfileCookTravelPageUpdatesDocument,
    ProfileTravelCookUpdateDocument,
    ProfileTravelLocationSuggestionsDocument,
} from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { cookNavRouteBySlug } from './cookCatalog';

const route = cookNavRouteBySlug('travel');
export function profileCookTravelEditPageTitle(locale: Locale): string {
    return t(locale, 'profileCook', 'travelEdit.title');
}
export const profileCookTravelEditPageDescription = route.description;

const TRAVEL_DISTANCE_OPTIONS = ['50', '100', '150', '200'] as const;

type TravelFormValues = {
    locationSearchText: string;
    selectedLocation: GqlCLocationSuggestion | null;
    travelExpensesText: string;
    maximumTravelDistanceText: string;
};

function centsToEuroText(cents: number): string {
    return (cents / 100).toFixed(2).replace('.', ',');
}

function euroTextToCents(value: string): { cents: number } | { error: string; locale: 'de' | 'en' } {
    if (value.trim() === '') {
        return { error: 'empty', locale: 'de' };
    }
    if (/[a-zA-Z]/u.test(value)) {
        return { error: 'letters', locale: 'de' };
    }
    if (!/^-?\d*([.,]\d{0,2})?$/u.test(value)) {
        return { error: 'format', locale: 'de' };
    }
    const floatValue = Number.parseFloat(value.replace(',', '.'));
    if (Number.isNaN(floatValue)) {
        return { error: 'number', locale: 'de' };
    }
    return { cents: Math.round(floatValue * 100) };
}

function formFromCook(next: GqlCProfileTravelCookFragment): TravelFormValues {
    return {
        locationSearchText: next.exactTravelOriginAddress?.displayText ?? '',
        selectedLocation: next.exactTravelOriginAddress
            ? {
                  displayText: next.exactTravelOriginAddress.displayText,
                  latitude: next.exactTravelOriginAddress.latitude,
                  longitude: next.exactTravelOriginAddress.longitude,
                  structuredAddress: next.exactTravelOriginAddress,
              }
            : null,
        travelExpensesText: centsToEuroText(next.travelExpensesAmount),
        maximumTravelDistanceText: String(next.maximumTravelDistance ?? 100),
    };
}

export function ProfileCookTravelEditPage({ data }: { data: GqlCProfileCookTravelPageQuery }) {
    const locale = useLocale();
    const navigate = useNavigate();
    const seedUser = data.currentSession.user ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCookTravelPageUpdatesDocument);
    const [, updateCook] = useMutation(ProfileTravelCookUpdateDocument);

    const cook = user?.cook ?? null;

    const form = useForm({
        defaultValues: cook
            ? formFromCook(cook)
            : {
                  locationSearchText: '',
                  selectedLocation: null as GqlCLocationSuggestion | null,
                  travelExpensesText: '0,25',
                  maximumTravelDistanceText: '100',
              },
        onSubmit: async ({ value }) => {
            if (!cook) return;
            const amount = euroTextToCents(value.travelExpensesText);
            if ('error' in amount) {
                toast.error(t(locale, 'profileCook', 'travelEdit.invalidExpenses'));
                return;
            }
            if (amount.cents < 25) {
                toast.error(t(locale, 'profileCook', 'travelEdit.minExpenses'));
                return;
            }
            const distance = Number(value.maximumTravelDistanceText);
            if (!Number.isInteger(distance) || distance < 5 || distance > 250) {
                toast.error(t(locale, 'profileCook', 'travelEdit.distanceRange'));
                return;
            }

            const result = await updateCook({
                input: {
                    exactTravelOriginAddress: value.selectedLocation?.displayText ?? undefined,
                    travelExpensesAmount: amount.cents,
                    maximumTravelDistance: distance,
                },
            });
            if (result.error || !result.data?.user.cook.update.success) {
                toast.error(t(locale, 'common', 'saveFailed'));
                return;
            }
            toast.success(t(locale, 'profileCook', 'actions.saved'));
            await navigate({ to: '/{-$locale}/profile/travel' });
        },
    });

    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const isDirty = useSelector(form.store, (state) => state.isDirty);
    const locationSearchText = useSelector(form.store, (state) => state.values.locationSearchText);
    const selectedLocation = useSelector(form.store, (state) => state.values.selectedLocation);
    const maximumTravelDistanceText = useSelector(form.store, (state) => state.values.maximumTravelDistanceText);
    const previewRadiusKm = Number(maximumTravelDistanceText);
    const mapRadiusKm = Number.isFinite(previewRadiusKm) && previewRadiusKm > 0 ? previewRadiusKm : null;

    useEffect(() => {
        if (!cook) return;
        if (!isDirty) {
            form.reset(formFromCook(cook));
        }
    }, [form, isDirty, cook]);

    const debouncedLocationSearch = useDebouncedValue(locationSearchText, 300);
    const [{ data: suggestionsData, fetching: suggestionsFetching }] = useQuery({
        query: ProfileTravelLocationSuggestionsDocument,
        variables: { searchText: debouncedLocationSearch, onlyFullAddresses: true },
        pause: debouncedLocationSearch.trim().length < 3 || selectedLocation?.displayText === locationSearchText,
    });
    const suggestions = suggestionsData?.currentSession.locationSuggestions ?? [];

    if (!cook) {
        return null;
    }

    return (
        <ProfilePinnedFooterLayout
            contentClassName="grid min-w-0 content-start gap-8"
            footer={
                isDirty ? (
                    <>
                        <Button type="button" variant="outline" disabled={isSubmitting} asChild>
                            <Link to="/{-$locale}/profile/travel">{t(locale, 'common', 'cancel')}</Link>
                        </Button>
                        <Button type="submit" form="travel-form" disabled={isSubmitting}>
                            {isSubmitting ? t(locale, 'profileCook', 'actions.saving') : t(locale, 'common', 'save')}
                        </Button>
                    </>
                ) : (
                    <Button type="button" disabled={isSubmitting} asChild>
                        <Link to="/{-$locale}/profile/travel">{t(locale, 'profileCook', 'travelEdit.backToTravel')}</Link>
                    </Button>
                )
            }
        >
            <div className="grid gap-2">
                <h1 className="font-serif text-3xl/tight text-foreground">{profileCookTravelEditPageTitle(locale)}</h1>
                <p className="text-muted-foreground">{profileCookTravelEditPageDescription(locale)}</p>
            </div>

            <form
                id="travel-form"
                className="grid min-w-0 content-start gap-8"
                onSubmit={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void form.handleSubmit();
                }}
            >
                <section className="grid min-w-0 gap-4">
                    <div className="grid min-w-0 gap-2">
                        <span className="text-sm font-medium">{t(locale, 'profileCook', 'travelEdit.origin')}</span>
                        <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'travelEdit.originHint')}</p>
                        <Combobox
                            filter={null}
                            items={suggestions.map((suggestion) => suggestion.displayText)}
                            value={selectedLocation?.displayText ?? null}
                            inputValue={locationSearchText}
                            onValueChange={(next) => {
                                if (next == null) return;
                                const match = suggestions.find((suggestion) => suggestion.displayText === next);
                                if (match) {
                                    form.setFieldValue('selectedLocation', match);
                                    form.setFieldValue('locationSearchText', match.displayText);
                                }
                            }}
                            onInputValueChange={(next) => {
                                form.setFieldValue('locationSearchText', next);
                                if (selectedLocation && next !== selectedLocation.displayText) {
                                    form.setFieldValue('selectedLocation', null);
                                }
                            }}
                            itemToStringLabel={(item: string) => item}
                        >
                            <ComboboxInput
                                className="w-full min-w-0"
                                placeholder={t(locale, 'profileCook', 'actions.searchAddress')}
                                showClear={false}
                            />
                            <ComboboxContent>
                                <ComboboxEmpty>
                                    {suggestionsFetching
                                        ? t(locale, 'profileCook', 'actions.searching')
                                        : t(locale, 'profileCook', 'actions.noMatches')}
                                </ComboboxEmpty>
                                <ComboboxList>
                                    {(item: string) => (
                                        <ComboboxItem key={item} value={item}>
                                            {item}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                        {selectedLocation?.structuredAddress ? (
                            <p className="text-sm text-muted-foreground">
                                {t(locale, 'profileCook', 'travelEdit.customersSee', {
                                    city: selectedLocation.structuredAddress.city,
                                })}
                            </p>
                        ) : null}
                    </div>
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                        <form.Field name="maximumTravelDistanceText">
                            {(field) => (
                                <div className="grid min-w-0 gap-2">
                                    <span className="text-sm font-medium">{t(locale, 'profileCook', 'travelEdit.maxDistance')}</span>
                                    <Select value={field.state.value} onValueChange={(next) => field.handleChange(next)}>
                                        <SelectTrigger className="w-full min-w-0">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TRAVEL_DISTANCE_OPTIONS.map((option) => (
                                                <SelectItem key={option} value={option}>
                                                    {option} km
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </form.Field>
                        <form.Field name="travelExpensesText">
                            {(field) => (
                                <div className="grid min-w-0 gap-2">
                                    <label htmlFor="travel-expenses" className="text-sm font-medium">
                                        {t(locale, 'profileCook', 'travelEdit.expensesPerKm')}
                                    </label>
                                    <div className="relative min-w-0">
                                        <Input
                                            id="travel-expenses"
                                            name={field.name}
                                            value={field.state.value}
                                            onBlur={field.handleBlur}
                                            onChange={(event) => field.handleChange(event.target.value)}
                                            className="pr-8"
                                        />
                                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
                                            €
                                        </span>
                                    </div>
                                </div>
                            )}
                        </form.Field>
                    </div>
                    {selectedLocation && Number.isFinite(selectedLocation.latitude) && Number.isFinite(selectedLocation.longitude) ? (
                        <div className="grid min-w-0 gap-2">
                            <CookTravelRadiusMap
                                latitude={selectedLocation.latitude}
                                longitude={selectedLocation.longitude}
                                radiusKm={mapRadiusKm}
                            />
                            <p className="text-sm text-muted-foreground">{t(locale, 'profileCook', 'travel.mapHint')}</p>
                        </div>
                    ) : null}
                </section>
            </form>
        </ProfilePinnedFooterLayout>
    );
}
