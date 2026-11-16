import type { DocumentNode } from 'graphql';
import { useState } from 'react';
import { useQuery } from 'urql';

import { t } from '../../i18n/t';
import type { Locale } from '../../shared';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from './base/combobox';

export type CityCenterSelection = {
    latitude: number;
    longitude: number;
    displayText: string;
};

type LocationSuggestionsData = {
    currentSession: {
        locationSuggestions: Array<{
            displayText: string;
            latitude: number;
            longitude: number;
        }>;
    };
};

export function AdminCityCenterField({
    locale,
    value,
    onChange,
    suggestionsQuery,
    disabled,
}: {
    locale: Locale;
    value: CityCenterSelection | null;
    onChange: (next: CityCenterSelection | null) => void;
    suggestionsQuery: DocumentNode;
    disabled?: boolean;
}) {
    const [searchText, setSearchText] = useState(value?.displayText ?? '');
    const debouncedSearch = useDebouncedValue(searchText, 300);

    const [{ data, fetching }] = useQuery<LocationSuggestionsData>({
        query: suggestionsQuery,
        variables: { searchText: debouncedSearch, onlyFullAddresses: false },
        pause: debouncedSearch.trim().length < 2 || value?.displayText === searchText,
    });
    const suggestions = data?.currentSession.locationSuggestions ?? [];

    return (
        <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t(locale, 'admin', 'copy.cityCenter')}</span>
            <Combobox
                filter={null}
                items={suggestions.map((suggestion) => suggestion.displayText)}
                value={value?.displayText ?? null}
                inputValue={searchText}
                onValueChange={(next) => {
                    if (next == null) return;
                    const match = suggestions.find((suggestion) => suggestion.displayText === next);
                    if (!match) return;
                    onChange({
                        latitude: match.latitude,
                        longitude: match.longitude,
                        displayText: match.displayText,
                    });
                    setSearchText(match.displayText);
                }}
                onInputValueChange={(next) => {
                    setSearchText(next);
                    if (value && next !== value.displayText) {
                        onChange(null);
                    }
                }}
                itemToStringLabel={(displayText: string) => displayText}
            >
                <ComboboxInput
                    className="w-full"
                    placeholder={t(locale, 'admin', 'copy.searchCity')}
                    showClear={false}
                    disabled={disabled}
                    required={!value}
                />
                <ComboboxContent>
                    <ComboboxEmpty>{fetching ? t(locale, 'admin', 'copy.searching') : t(locale, 'admin', 'copy.noMatches')}</ComboboxEmpty>
                    <ComboboxList>{(displayText: string) => <ComboboxItem value={displayText}>{displayText}</ComboboxItem>}</ComboboxList>
                </ComboboxContent>
            </Combobox>
            {value ? (
                <p className="text-xs text-muted-foreground">
                    {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
                </p>
            ) : (
                <p className="text-xs text-muted-foreground">{t(locale, 'admin', 'copy.requiredForNearbyChefRecommendations')}</p>
            )}
        </div>
    );
}
