import type { WebPageKey } from '../../../shared/webPage';
import { adminOverviewRangeResolve, adminOverviewRangeToGraphQlVariables, parseAdminOverviewRangeSearch } from './adminOverviewRange';
import type { AdminOverviewDateRange, AdminOverviewRangeSearch } from './adminOverviewRange';
import { adminTrafficSearchResolve, adminTrafficSearchToUrl } from './adminTrafficSearch';
import type { AdminTrafficSearch } from './adminTrafficSearch';

export const ADMIN_ANALYTICS_TABS = ['booking', 'cooks', 'sign-in', 'gift-cards'] as const;

export type AdminAnalyticsTab = (typeof ADMIN_ANALYTICS_TABS)[number];

export type AdminAnalyticsSearch = AdminOverviewRangeSearch & {
    tab?: AdminAnalyticsTab;
};

const WEB_PAGE_KEY_ANALYTICS_TAB = {
    BOOKING_REQUEST_FORM: 'booking',
    GIFT_CARD: 'gift-cards',
    CHEF_SIGN_UP: 'cooks',
    SIGN_IN: 'sign-in',
} as const satisfies Partial<Record<WebPageKey, AdminAnalyticsTab>>;

const ANALYTICS_TAB_TRAFFIC_KEY = {
    booking: 'BOOKING_REQUEST_FORM',
    cooks: 'CHEF_SIGN_UP',
    'sign-in': 'SIGN_IN',
    'gift-cards': 'GIFT_CARD',
} as const satisfies Record<AdminAnalyticsTab, WebPageKey>;

function isAdminAnalyticsTab(value: unknown): value is AdminAnalyticsTab {
    return typeof value === 'string' && (ADMIN_ANALYTICS_TABS as readonly string[]).includes(value);
}

export function parseAdminAnalyticsSearch(search: Record<string, unknown>): AdminAnalyticsSearch {
    const tab = isAdminAnalyticsTab(search.tab) ? search.tab : undefined;
    return {
        ...parseAdminOverviewRangeSearch(search),
        tab,
    };
}

export function adminAnalyticsTabResolve(search: AdminAnalyticsSearch): AdminAnalyticsTab {
    return search.tab ?? 'booking';
}

export function adminAnalyticsSearchForUrl(search: AdminAnalyticsSearch): AdminAnalyticsSearch {
    const tab = search.tab && search.tab !== 'booking' ? search.tab : undefined;
    return {
        from: search.from,
        to: search.to,
        tab,
    };
}

export function adminAnalyticsSearchForRange(range: AdminOverviewDateRange, tab?: AdminAnalyticsTab): AdminAnalyticsSearch {
    return adminAnalyticsSearchForUrl({ from: range.from, to: range.to, tab });
}

export function adminAnalyticsTabForWebPageKey(key: WebPageKey): AdminAnalyticsTab | undefined {
    return WEB_PAGE_KEY_ANALYTICS_TAB[key as keyof typeof WEB_PAGE_KEY_ANALYTICS_TAB];
}

export function adminAnalyticsSearchForPageKey(range: AdminOverviewDateRange, key: WebPageKey): AdminAnalyticsSearch | undefined {
    const tab = adminAnalyticsTabForWebPageKey(key);
    if (tab == null) return undefined;
    return adminAnalyticsSearchForRange(range, tab);
}

export function adminTrafficSearchForAnalyticsTab(range: AdminOverviewDateRange, tab: AdminAnalyticsTab): AdminTrafficSearch {
    return adminTrafficSearchToUrl(
        adminTrafficSearchResolve({
            from: range.from,
            to: range.to,
            keys: ANALYTICS_TAB_TRAFFIC_KEY[tab],
        }),
    );
}

export function adminAnalyticsPageVariables(search: AdminAnalyticsSearch = {}) {
    const tab = adminAnalyticsTabResolve(search);
    return {
        ...adminOverviewRangeToGraphQlVariables(adminOverviewRangeResolve(search)),
        formVisitWebPageKey: 'BOOKING_REQUEST_FORM' as const,
        giftCardVisitWebPageKey: 'GIFT_CARD' as const,
        includeBooking: tab === 'booking',
        includeCooks: tab === 'cooks',
        includeSignIn: tab === 'sign-in',
        includeGiftCards: tab === 'gift-cards',
    };
}
