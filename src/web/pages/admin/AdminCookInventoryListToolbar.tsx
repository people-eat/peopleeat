import { useEffect, useState } from 'react';
import { useQuery } from 'urql';

import { t } from '../../../i18n/t';
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
                <SelectTrigger size="sm" aria-label={t(locale, 'admin', 'copy.filterByStatus')} className="w-auto min-w-36">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__all__">{t(locale, 'admin', 'copy.allStatuses')}</SelectItem>
                    <SelectItem value="PUBLISHED">{t(locale, 'admin', 'copy.published2')}</SelectItem>
                    <SelectItem value="DRAFT">{t(locale, 'admin', 'copy.draft')}</SelectItem>
                    <SelectItem value="DELETED">{t(locale, 'admin', 'copy.deleted')}</SelectItem>
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
                <SelectTrigger size="sm" aria-label={t(locale, 'admin', 'copy.sort')} className="w-auto min-w-40">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="createdAt:desc">{t(locale, 'admin', 'copy.newestFirst')}</SelectItem>
                    <SelectItem value="createdAt:asc">{t(locale, 'admin', 'copy.oldestFirst')}</SelectItem>
                    <SelectItem value="title:asc">{t(locale, 'admin', 'copy.titleAZ')}</SelectItem>
                    <SelectItem value="title:desc">{t(locale, 'admin', 'copy.titleZA')}</SelectItem>
                    <SelectItem value="publishedAt:desc">{t(locale, 'admin', 'copy.recentlyPublished')}</SelectItem>
                    <SelectItem value="deletedAt:desc">{t(locale, 'admin', 'copy.recentlyDeleted')}</SelectItem>
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
                    <SelectTrigger size="sm" aria-label={t(locale, 'admin', 'copy.imageFilter')} className="w-auto min-w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all__">{t(locale, 'admin', 'copy.allImages')}</SelectItem>
                        <SelectItem value="with">{t(locale, 'admin', 'copy.withImage')}</SelectItem>
                        <SelectItem value="without">{t(locale, 'admin', 'copy.withoutImage')}</SelectItem>
                        <SelectItem value="public">{t(locale, 'admin', 'copy.onPublicPage')}</SelectItem>
                        <SelectItem value="notPublic">{t(locale, 'admin', 'copy.notOnPublicPage')}</SelectItem>
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
                        placeholder={t(locale, 'admin', 'copy.filterCook')}
                        showClear={search.cookId != null}
                        aria-label={t(locale, 'admin', 'copy.filterCook2')}
                    />
                    <ComboboxContent>
                        <ComboboxEmpty>
                            {cooksFetching ? t(locale, 'admin', 'copy.searching') : t(locale, 'admin', 'copy.noMatches')}
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
                    {t(locale, 'admin', 'copy.clearFilters')}
                </Button>
            ) : null}
        </div>
    );
}
