import type { Dispatch, SetStateAction } from 'react';
import { useQuery } from 'urql';

import type { GqlCCookCreate, GqlCLocationSuggestion } from '../graphql/generated';
import { CookCreateLocationSuggestionsDocument } from '../graphql/generated';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useLocale } from '../hooks/useLocale';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from './base/combobox';
import { Input } from './base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './base/select';

const TRAVEL_DISTANCE_OPTIONS = ['50', '100', '150', '200'] as const;

export type CookCreateFieldsState = {
    locationSearchText: string;
    selectedLocation: GqlCLocationSuggestion | null;
    travelExpensesText: string;
    maximumTravelDistanceText: string;
};

export function cookCreateFieldsInitial(): CookCreateFieldsState {
    return {
        locationSearchText: '',
        selectedLocation: null,
        travelExpensesText: '0,25',
        maximumTravelDistanceText: '100',
    };
}

function euroTextToCents(value: string): number | null {
    if (value.trim() === '') return null;
    if (/[a-zA-Z]/u.test(value)) return null;
    if (!/^-?\d*([.,]\d{0,2})?$/u.test(value)) return null;
    const floatValue = Number.parseFloat(value.replace(',', '.'));
    if (Number.isNaN(floatValue)) return null;
    return Math.round(floatValue * 100);
}

export function cookCreateFieldsReady(state: CookCreateFieldsState): boolean {
    return (
        Boolean(state.selectedLocation?.displayText) &&
        euroTextToCents(state.travelExpensesText) !== null &&
        (euroTextToCents(state.travelExpensesText) ?? 0) >= 25 &&
        Number.isInteger(Number(state.maximumTravelDistanceText)) &&
        Number(state.maximumTravelDistanceText) >= 5 &&
        Number(state.maximumTravelDistanceText) <= 250
    );
}

export function cookCreateInputFromFields(
    state: CookCreateFieldsState,
): { input: GqlCCookCreate } | { error: 'travelExpenses' | 'travelDistance' | 'incomplete' } {
    if (!state.selectedLocation?.displayText) {
        return { error: 'incomplete' };
    }
    const cents = euroTextToCents(state.travelExpensesText);
    if (cents === null || cents < 25) {
        return { error: 'travelExpenses' };
    }
    const distance = Number(state.maximumTravelDistanceText);
    if (!Number.isInteger(distance) || distance < 5 || distance > 250) {
        return { error: 'travelDistance' };
    }
    return {
        input: {
            exactTravelOriginAddress: state.selectedLocation.displayText,
            travelExpensesAmount: cents,
            maximumTravelDistance: distance,
        },
    };
}

export function CookCreateFields({
    value,
    onChange,
    disabled = false,
    idPrefix = 'cook-create',
}: {
    value: CookCreateFieldsState;
    onChange: Dispatch<SetStateAction<CookCreateFieldsState>>;
    disabled?: boolean;
    idPrefix?: string;
}) {
    const locale = useLocale();
    const debouncedLocationSearch = useDebouncedValue(value.locationSearchText, 300);
    const [{ data: suggestionsData, fetching: suggestionsFetching }] = useQuery({
        query: CookCreateLocationSuggestionsDocument,
        variables: { searchText: debouncedLocationSearch, onlyFullAddresses: true },
        pause: debouncedLocationSearch.trim().length < 3 || value.selectedLocation?.displayText === value.locationSearchText,
    });
    const suggestions = suggestionsData?.currentSession.locationSuggestions ?? [];

    return (
        <div className="grid gap-5">
            <div className="grid gap-3">
                <div className="grid gap-1.5">
                    <span className="text-sm font-medium">
                        {{ de: 'Startadresse für die Reisestrecke', en: 'Travel origin address' }[locale]}
                    </span>
                    <p className="text-sm/relaxed text-muted-foreground">
                        {
                            {
                                de: 'Wird nicht für Gastgeber angezeigt. Sie sehen nur die Stadt.',
                                en: 'Not shown to hosts. They only see the city.',
                            }[locale]
                        }
                    </p>
                </div>
                <Combobox
                    filter={null}
                    items={suggestions.map((suggestion) => suggestion.displayText)}
                    value={value.selectedLocation?.displayText ?? null}
                    inputValue={value.locationSearchText}
                    onValueChange={(next) => {
                        if (next == null) return;
                        const match = suggestions.find((suggestion) => suggestion.displayText === next);
                        if (match) {
                            onChange((prev) => ({
                                ...prev,
                                selectedLocation: match,
                                locationSearchText: match.displayText,
                            }));
                        }
                    }}
                    onInputValueChange={(next) => {
                        onChange((prev) => ({
                            ...prev,
                            locationSearchText: next,
                            selectedLocation:
                                prev.selectedLocation && next !== prev.selectedLocation.displayText ? null : prev.selectedLocation,
                        }));
                    }}
                    itemToStringLabel={(item: string) => item}
                >
                    <ComboboxInput
                        className="w-full"
                        disabled={disabled}
                        placeholder={{ de: 'Adresse suchen…', en: 'Search address…' }[locale]}
                        showClear={false}
                    />
                    <ComboboxContent>
                        <ComboboxEmpty>
                            {suggestionsFetching
                                ? { de: 'Suche…', en: 'Searching…' }[locale]
                                : { de: 'Keine Treffer.', en: 'No matches.' }[locale]}
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
                {value.selectedLocation?.structuredAddress ? (
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: `Gastgeber sehen ${value.selectedLocation.structuredAddress.city}.`,
                                en: `Hosts will see ${value.selectedLocation.structuredAddress.city}.`,
                            }[locale]
                        }
                    </p>
                ) : null}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                    <span className="text-sm font-medium">{{ de: 'Maximale Reisestrecke', en: 'Maximum travel distance' }[locale]}</span>
                    <Select
                        value={value.maximumTravelDistanceText}
                        disabled={disabled}
                        onValueChange={(maximumTravelDistanceText) => onChange((prev) => ({ ...prev, maximumTravelDistanceText }))}
                    >
                        <SelectTrigger className="w-full">
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
                <div className="grid gap-2">
                    <label htmlFor={`${idPrefix}-travel-expenses`} className="text-sm font-medium">
                        {{ de: 'Reisekosten je km', en: 'Travel expenses per km' }[locale]}
                    </label>
                    <div className="relative">
                        <Input
                            id={`${idPrefix}-travel-expenses`}
                            disabled={disabled}
                            value={value.travelExpensesText}
                            onChange={(event) => onChange((prev) => ({ ...prev, travelExpensesText: event.target.value }))}
                            className="pr-8"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">€</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
