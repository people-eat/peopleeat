import type { Dispatch, SetStateAction } from 'react';
import { useQuery } from 'urql';

import {
    COOK_TRAVEL_DISTANCE_SELECT_DEFAULT_KM,
    cookTravelDistanceSelectOptions,
    cookTravelDistanceSelectValue,
} from '../../shared/cookTravelDistance';
import type { GqlCCookCreate, GqlCLocationSuggestion } from '../graphql/generated';
import { CookCreateLocationSuggestionsDocument } from '../graphql/generated';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useT } from '../hooks/useT';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from './base/combobox';
import { Input } from './base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './base/select';

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
        maximumTravelDistanceText: cookTravelDistanceSelectValue(COOK_TRAVEL_DISTANCE_SELECT_DEFAULT_KM),
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
    options?: { inviteCookId?: string | null },
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
    const inviteCookId = options?.inviteCookId?.trim();
    return {
        input: {
            exactTravelOriginAddress: state.selectedLocation.displayText,
            travelExpensesAmount: cents,
            maximumTravelDistance: distance,
            ...(inviteCookId ? { inviteCookId } : {}),
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
    const { t } = useT('public');
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
                    <span className="text-sm font-medium">{t('chefSignUp.originAddress')}</span>
                    <p className="text-sm/relaxed text-muted-foreground">{t('chefSignUp.originHint')}</p>
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
                    <ComboboxInput className="w-full" disabled={disabled} placeholder={t('chefSignUp.searchAddress')} showClear={false} />
                    <ComboboxContent>
                        <ComboboxEmpty>{suggestionsFetching ? t('chefSignUp.searching') : t('chefSignUp.noMatches')}</ComboboxEmpty>
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
                        {t('chefSignUp.hostsSeeCity', { city: value.selectedLocation.structuredAddress.city })}
                    </p>
                ) : null}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                    <span className="text-sm font-medium">{t('chefSignUp.maxDistance')}</span>
                    <Select
                        value={value.maximumTravelDistanceText}
                        disabled={disabled}
                        onValueChange={(maximumTravelDistanceText) => onChange((prev) => ({ ...prev, maximumTravelDistanceText }))}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue>{`${value.maximumTravelDistanceText} km`}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {cookTravelDistanceSelectOptions().map((option) => (
                                <SelectItem key={option} value={option}>
                                    {option} km
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <label htmlFor={`${idPrefix}-travel-expenses`} className="text-sm font-medium">
                        {t('chefSignUp.travelPerKm')}
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
