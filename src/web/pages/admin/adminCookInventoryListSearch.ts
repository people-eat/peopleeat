import type {
    GqlCAdminCookInventoryStatus,
    GqlCAdminCookMealImageFilter,
    GqlCAdminCookMealSortField,
    GqlCAdminCookMenuSortField,
} from '../../graphql/generated';
import { adminListPaginationForUrl, adminListSkipTake, parseAdminListPage, parseAdminListPageSize } from './adminListPaginationSearch';
import type { AdminListPaginationSearch } from './adminListPaginationSearch';
import { adminListSortSearchForUrl, adminListSortToCriterion, parseAdminListSortSearch } from './adminListSortSearch';
import type { AdminListSortSearch } from './adminListSortSearch';

const ADMIN_COOK_INVENTORY_SORT_FIELDS = ['title', 'createdAt', 'publishedAt', 'deletedAt'] as const;

type AdminCookInventorySortField = (typeof ADMIN_COOK_INVENTORY_SORT_FIELDS)[number];

const ADMIN_COOK_INVENTORY_IMAGE_URL_VALUES = ['with', 'without', 'public', 'notPublic'] as const;

export type AdminCookInventoryImageUrl = (typeof ADMIN_COOK_INVENTORY_IMAGE_URL_VALUES)[number];

const IMAGE_FILTER_BY_URL: Record<AdminCookInventoryImageUrl, GqlCAdminCookMealImageFilter> = {
    with: 'WITH_IMAGE',
    without: 'WITHOUT_IMAGE',
    public: 'ON_PUBLIC_PAGE',
    notPublic: 'NOT_ON_PUBLIC_PAGE',
};

const IMAGE_URL_SET = new Set<string>(ADMIN_COOK_INVENTORY_IMAGE_URL_VALUES);

export type AdminCookInventoryListSearch = AdminListPaginationSearch &
    AdminListSortSearch<AdminCookInventorySortField> & {
        q?: string;
        status?: GqlCAdminCookInventoryStatus;
        cookId?: string;
        image?: AdminCookInventoryImageUrl;
    };

const STATUS_SET = new Set<string>(['PUBLISHED', 'DRAFT', 'DELETED']);

export function parseAdminCookInventoryListSearch(search: Record<string, unknown>): AdminCookInventoryListSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    const status =
        typeof search.status === 'string' && STATUS_SET.has(search.status) ? (search.status as GqlCAdminCookInventoryStatus) : undefined;
    const cookId = typeof search.cookId === 'string' && search.cookId.trim().length > 0 ? search.cookId.trim() : undefined;
    const imageFromUrl =
        typeof search.image === 'string' && IMAGE_URL_SET.has(search.image) ? (search.image as AdminCookInventoryImageUrl) : undefined;
    const image =
        imageFromUrl ??
        // Back-compat for the previous `missingImage=1` URL.
        (search.missingImage === true || search.missingImage === '1' || search.missingImage === 'true'
            ? ('notPublic' as const)
            : undefined);
    const page = parseAdminListPage(search);
    const pageSize = parseAdminListPageSize(search);
    const { sort, dir } = parseAdminListSortSearch(search, ADMIN_COOK_INVENTORY_SORT_FIELDS);
    return { q, status, cookId, image, page, pageSize, sort, dir };
}

export function adminCookInventoryListSearchForUrl(search: AdminCookInventoryListSearch): AdminCookInventoryListSearch {
    return {
        q: search.q,
        status: search.status,
        cookId: search.cookId,
        image: search.image,
        ...adminListPaginationForUrl(search),
        ...adminListSortSearchForUrl(search),
    };
}

export function adminCookInventoryListHasActiveFilters(search: AdminCookInventoryListSearch): boolean {
    return (
        search.q != null ||
        search.status != null ||
        search.cookId != null ||
        search.image != null ||
        search.sort != null ||
        search.dir != null
    );
}

export function adminCookInventoryListCriterion(
    search: AdminCookInventoryListSearch,
    options?: { includeImageFilter?: boolean },
): {
    skip: number;
    take: number;
    searchText?: string;
    cookIds?: string[];
    includeDeleted: boolean;
    status?: GqlCAdminCookInventoryStatus;
    imageFilter?: GqlCAdminCookMealImageFilter;
    sortField?: GqlCAdminCookMealSortField | GqlCAdminCookMenuSortField;
    sortDirection?: 'ASC' | 'DESC';
} {
    const status = search.status;
    const includeDeleted = status == null || status === 'DELETED';
    return {
        ...adminListSkipTake(search),
        searchText: search.q,
        cookIds: search.cookId ? [search.cookId] : undefined,
        includeDeleted,
        status,
        ...(options?.includeImageFilter && search.image != null ? { imageFilter: IMAGE_FILTER_BY_URL[search.image] } : {}),
        ...adminListSortToCriterion(search),
    };
}
