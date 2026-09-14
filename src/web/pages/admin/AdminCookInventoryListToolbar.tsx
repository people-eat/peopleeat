import { useEffect, useState } from 'react';
import { useQuery } from 'urql';

import { Button } from '../../components/base/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '../../components/base/combobox';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { AdminCookInventoryCookPrefillDocument, AdminCookInventoryCookSearchDocument } from '../../graphql/generated';
import type { GqlCAdminCookInventoryStatus } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import type { AdminCookInventoryImageUrl, AdminCookInventoryListSearch } from './adminCookInventoryListSearch';
import { adminCookInventoryListHasActiveFilters } from './adminCookInventoryListSearch';

type CookRow = {
    userId: string;
    firstName: string;
    lastName: string;
    emailAddress?: string | null;
};

function cookLabel(cook: Pick<CookRow, 'firstName' | 'lastName' | 'emailAddress'>) {
    const name = `${cook.firstName} ${cook.lastName}`.trim();
    if (name.length > 0) return name;
    return cook.emailAddress?.trim() || cook.firstName;
}

function sortValue(search: AdminCookInventoryListSearch) {
    return `${search.sort ?? 'createdAt'}:${search.dir ?? 'desc'}`;
}

export function AdminCookInventoryListToolbar({
    search,
    onSearchChange,
    searchPlaceholder,
    showImageFilter = false,
}: {
    search: AdminCookInventoryListSearch;
    onSearchChange: (next: AdminCookInventoryListSearch) => void;
    searchPlaceholder: string;
    showImageFilter?: boolean;
}) {
    const locale = useLocale();
    const [draftQ, setDraftQ] = useState(search.q ?? '');
    const debouncedQ = useDebouncedValue(draftQ, 300);
    const [cookSearchText, setCookSearchText] = useState('');
    const debouncedCookSearch = useDebouncedValue(cookSearchText, 300);

    useEffect(() => {
        setDraftQ(search.q ?? '');
    }, [search.q]);

    useEffect(() => {
        const nextQ = debouncedQ.trim() || undefined;
        if (nextQ === search.q) return;
        onSearchChange({ ...search, q: nextQ, page: undefined });
    }, [debouncedQ, onSearchChange, search]);

    const [{ data: prefillData }] = useQuery({
        query: AdminCookInventoryCookPrefillDocument,
        variables: { userId: search.cookId ?? '' },
        pause: search.cookId == null,
    });
    const selectedCook = prefillData?.currentSession.user?.admin?.user ?? null;

    useEffect(() => {
        if (selectedCook == null) {
            if (search.cookId == null) setCookSearchText('');
            return;
        }
        setCookSearchText(cookLabel(selectedCook));
    }, [search.cookId, selectedCook]);

    const [{ data: cooksData, fetching: cooksFetching }] = useQuery({
        query: AdminCookInventoryCookSearchDocument,
        variables: {
            criterion: {
                skip: 0,
                take: 20,
                types: ['cook'],
                searchText: debouncedCookSearch.trim() || undefined,
            },
        },
        pause: debouncedCookSearch.trim().length < 2 || (selectedCook != null && cookSearchText === cookLabel(selectedCook)),
    });
    const cooks = cooksData?.currentSession.user?.admin?.users ?? [];

    const hasActiveFilters = adminCookInventoryListHasActiveFilters(search);

    function update(partial: Partial<AdminCookInventoryListSearch>) {
        onSearchChange({ ...search, ...partial, page: undefined });
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Input
                type="search"
                value={draftQ}
                onChange={(event) => setDraftQ(event.target.value)}
                placeholder={searchPlaceholder}
                className="min-w-48 max-w-md flex-1"
                aria-label={searchPlaceholder}
            />

            <Select
                value={search.status ?? '__all__'}
                onValueChange={(value) => {
                    update({
                        status: value != null && value !== '__all__' ? (value as GqlCAdminCookInventoryStatus) : undefined,
                    });
                }}
            >
                <SelectTrigger size="sm" aria-label={{ de: 'Status filtern', en: 'Filter by status' }[locale]} className="w-auto min-w-36">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__all__">{{ de: 'Alle Status', en: 'All statuses' }[locale]}</SelectItem>
                    <SelectItem value="PUBLISHED">{{ de: 'Veröffentlicht', en: 'Published' }[locale]}</SelectItem>
                    <SelectItem value="DRAFT">{{ de: 'Entwurf', en: 'Draft' }[locale]}</SelectItem>
                    <SelectItem value="DELETED">{{ de: 'Gelöscht', en: 'Deleted' }[locale]}</SelectItem>
                </SelectContent>
            </Select>

            <Select
                value={sortValue(search)}
                onValueChange={(value) => {
                    if (value == null) return;
                    const [sort, dir] = value.split(':');
                    if (sort == null || (dir !== 'asc' && dir !== 'desc')) return;
                    if (sort === 'createdAt' && dir === 'desc') {
                        update({ sort: undefined, dir: undefined });
                        return;
                    }
                    update({
                        sort: sort as AdminCookInventoryListSearch['sort'],
                        dir,
                    });
                }}
            >
                <SelectTrigger size="sm" aria-label={{ de: 'Sortierung', en: 'Sort' }[locale]} className="w-auto min-w-40">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="createdAt:desc">{{ de: 'Neueste zuerst', en: 'Newest first' }[locale]}</SelectItem>
                    <SelectItem value="createdAt:asc">{{ de: 'Älteste zuerst', en: 'Oldest first' }[locale]}</SelectItem>
                    <SelectItem value="title:asc">{{ de: 'Titel A–Z', en: 'Title A–Z' }[locale]}</SelectItem>
                    <SelectItem value="title:desc">{{ de: 'Titel Z–A', en: 'Title Z–A' }[locale]}</SelectItem>
                    <SelectItem value="publishedAt:desc">{{ de: 'Zuletzt veröffentlicht', en: 'Recently published' }[locale]}</SelectItem>
                    <SelectItem value="deletedAt:desc">{{ de: 'Zuletzt gelöscht', en: 'Recently deleted' }[locale]}</SelectItem>
                </SelectContent>
            </Select>

            {showImageFilter ? (
                <Select
                    value={search.image ?? '__all__'}
                    onValueChange={(value) => {
                        update({
                            image: value != null && value !== '__all__' ? (value as AdminCookInventoryImageUrl) : undefined,
                        });
                    }}
                >
                    <SelectTrigger size="sm" aria-label={{ de: 'Bildfilter', en: 'Image filter' }[locale]} className="w-auto min-w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all__">{{ de: 'Alle Bilder', en: 'All images' }[locale]}</SelectItem>
                        <SelectItem value="with">{{ de: 'Mit Bild', en: 'With image' }[locale]}</SelectItem>
                        <SelectItem value="without">{{ de: 'Ohne Bild', en: 'Without image' }[locale]}</SelectItem>
                        <SelectItem value="public">{{ de: 'Auf Profil', en: 'On public page' }[locale]}</SelectItem>
                        <SelectItem value="notPublic">{{ de: 'Nicht auf Profil', en: 'Not on public page' }[locale]}</SelectItem>
                    </SelectContent>
                </Select>
            ) : null}

            <div className="min-w-44 max-w-xs flex-1 basis-48">
                <Combobox
                    items={cooks.map((entry) => entry.userId)}
                    value={search.cookId ?? null}
                    inputValue={cookSearchText}
                    onValueChange={(next) => {
                        if (next == null) {
                            update({ cookId: undefined });
                            setCookSearchText('');
                            return;
                        }
                        const match = cooks.find((entry) => entry.userId === next);
                        if (!match) return;
                        update({ cookId: match.userId });
                        setCookSearchText(cookLabel(match));
                    }}
                    onInputValueChange={(next) => {
                        setCookSearchText(next);
                        if (search.cookId != null && selectedCook != null && next !== cookLabel(selectedCook)) {
                            update({ cookId: undefined });
                        }
                    }}
                    itemToStringLabel={(userId: string) => {
                        const match = cooks.find((entry) => entry.userId === userId) ?? selectedCook;
                        return match && match.userId === userId ? cookLabel(match) : userId;
                    }}
                >
                    <ComboboxInput
                        className="w-full"
                        placeholder={{ de: 'Koch filtern…', en: 'Filter cook…' }[locale]}
                        showClear={search.cookId != null}
                        aria-label={{ de: 'Koch filtern', en: 'Filter cook' }[locale]}
                    />
                    <ComboboxContent>
                        <ComboboxEmpty>
                            {cooksFetching
                                ? { de: 'Suche…', en: 'Searching…' }[locale]
                                : { de: 'Keine Treffer.', en: 'No matches.' }[locale]}
                        </ComboboxEmpty>
                        <ComboboxList>
                            {(userId: string) => {
                                const match = cooks.find((entry) => entry.userId === userId);
                                return (
                                    <ComboboxItem key={userId} value={userId}>
                                        {match ? cookLabel(match) : userId}
                                    </ComboboxItem>
                                );
                            }}
                        </ComboboxList>
                    </ComboboxContent>
                </Combobox>
            </div>

            {hasActiveFilters ? (
                <Button
                    type="button"
                    variant="link"
                    className="h-auto shrink-0 p-0 text-sm text-muted-foreground"
                    onClick={() =>
                        onSearchChange({
                            pageSize: search.pageSize,
                        })
                    }
                >
                    {{ de: 'Filter zurücksetzen', en: 'Clear filters' }[locale]}
                </Button>
            ) : null}
        </div>
    );
}
