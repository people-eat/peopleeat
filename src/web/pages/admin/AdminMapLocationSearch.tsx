import { SearchIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQuery } from 'urql';

import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../../components/base/combobox';
import { InputGroupAddon } from '../../components/base/input-group';
import { AdminMapLocationSuggestionsDocument } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import type { AdminMapPlaceFocus } from './adminMapSearch';

type AdminMapLocationSearchProps = {
    selected: AdminMapPlaceFocus | null;
    onSelect: (next: AdminMapPlaceFocus | null) => void;
};

export function AdminMapLocationSearch({ selected, onSelect }: AdminMapLocationSearchProps) {
    const locale = useLocale();
    const [searchText, setSearchText] = useState(selected?.label ?? '');
    const debouncedSearch = useDebouncedValue(searchText, 300);

    useEffect(() => {
        setSearchText(selected?.label ?? '');
    }, [selected?.label, selected?.latitude, selected?.longitude]);

    const [{ data, fetching }] = useQuery({
        query: AdminMapLocationSuggestionsDocument,
        variables: { searchText: debouncedSearch, onlyFullAddresses: false },
        pause: debouncedSearch.trim().length < 2 || selected?.label === searchText,
    });
    const suggestions = data?.currentSession.locationSuggestions ?? [];
    const searchPlaceholder = { de: 'Ort suchen…', en: 'Search location…' }[locale];

    return (
        <Combobox
            filter={null}
            items={suggestions.map((suggestion) => suggestion.displayText)}
            value={selected?.label ?? null}
            inputValue={searchText}
            onValueChange={(next) => {
                if (next == null) {
                    onSelect(null);
                    setSearchText('');
                    return;
                }
                const match = suggestions.find((suggestion) => suggestion.displayText === next);
                if (!match) return;
                onSelect({
                    kind: 'place',
                    latitude: match.latitude,
                    longitude: match.longitude,
                    label: match.displayText,
                });
                setSearchText(match.displayText);
            }}
            onInputValueChange={(next) => {
                setSearchText(next);
                if (next.trim().length === 0 && selected) {
                    onSelect(null);
                }
            }}
            itemToStringLabel={(displayText: string) => displayText}
        >
            <ComboboxInput
                className="w-full"
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                showClear={searchText.trim().length > 0}
            >
                <InputGroupAddon align="inline-start">
                    <SearchIcon />
                </InputGroupAddon>
            </ComboboxInput>
            <ComboboxContent>
                <ComboboxEmpty>
                    {fetching ? { de: 'Suche…', en: 'Searching…' }[locale] : { de: 'Keine Treffer.', en: 'No matches.' }[locale]}
                </ComboboxEmpty>
                <ComboboxList>{(displayText: string) => <ComboboxItem value={displayText}>{displayText}</ComboboxItem>}</ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}
