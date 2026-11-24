import { SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from 'urql';

import { t } from '../../../i18n/t';
import { WEB_PAGE_VISIT_ENTITY_SEARCH_MIN_QUERY } from '../../../shared/webPage';
import type { WebPageKeyWithVisitEntity } from '../../../shared/webPage';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../../components/base/combobox';
import { InputGroupAddon } from '../../components/base/input-group';
import { AdminTrafficEntitySearchDocument } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { adminOverviewRangeToGraphQlVariables } from './adminOverviewRange';
import { adminTrafficAddEntityLabel } from './adminTrafficLinks';
import type { AdminTrafficResolved } from './adminTrafficSearch';

export function AdminTrafficEntitySearch({
    focusedKey,
    resolved,
    onSelect,
}: {
    focusedKey: WebPageKeyWithVisitEntity;
    resolved: AdminTrafficResolved;
    onSelect: (id: string) => void;
}) {
    const locale = useLocale();
    const [searchText, setSearchText] = useState('');
    const debouncedSearch = useDebouncedValue(searchText, 300);
    const range = adminOverviewRangeToGraphQlVariables({ from: resolved.from, to: resolved.to }).range;
    const [{ data, fetching }] = useQuery({
        query: AdminTrafficEntitySearchDocument,
        variables: {
            webPageKey: focusedKey,
            query: debouncedSearch.trim(),
            range,
            audience: resolved.audience,
        },
        pause: debouncedSearch.trim().length < WEB_PAGE_VISIT_ENTITY_SEARCH_MIN_QUERY,
    });
    const suggestions = data?.currentSession.user?.admin?.webPageVisitEntitySearch ?? [];
    const placeholder = adminTrafficAddEntityLabel(locale, focusedKey);
    const selected = new Set(resolved.compareIds);

    return (
        <Combobox
            filter={null}
            items={suggestions.map((item) => item.id)}
            value={null}
            inputValue={searchText}
            onValueChange={(next) => {
                if (!next || selected.has(next)) return;
                onSelect(next);
                setSearchText('');
            }}
            onInputValueChange={setSearchText}
            itemToStringLabel={(id: string) => suggestions.find((item) => item.id === id)?.label ?? id}
        >
            <ComboboxInput className="w-56" placeholder={placeholder} aria-label={placeholder} showClear={searchText.trim().length > 0}>
                <InputGroupAddon align="inline-start">
                    <SearchIcon />
                </InputGroupAddon>
            </ComboboxInput>
            <ComboboxContent>
                <ComboboxEmpty>{fetching ? t(locale, 'admin', 'copy.searching') : t(locale, 'admin', 'copy.noMatches')}</ComboboxEmpty>
                <ComboboxList>
                    {(id: string) => {
                        const item = suggestions.find((row) => row.id === id);
                        if (!item) return null;
                        return (
                            <ComboboxItem value={id} disabled={selected.has(id)}>
                                {item.label}
                            </ComboboxItem>
                        );
                    }}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}
