import type { WebPageKey } from './webPage';

export type WebPageVisitMatch = {
    webPageKey: WebPageKey;
    params?: {
        cityId?: string;
        cookId?: string;
        blogPostId?: string;
        partnerVenueId?: string;
        occasionId?: string;
        bookingRequestId?: string;
        countryId?: string;
    };
};

function visitSearchParams(pathWithoutLocale: string, search = ''): URLSearchParams {
    const queryInPath = pathWithoutLocale.indexOf('?');
    const fromPath = queryInPath === -1 ? '' : pathWithoutLocale.slice(queryInPath + 1);
    const fromSearch = search.startsWith('?') ? search.slice(1) : search;
    return new URLSearchParams(fromSearch || fromPath);
}

function visitPathname(pathWithoutLocale: string): string {
    const queryInPath = pathWithoutLocale.indexOf('?');
    const pathOnly = queryInPath === -1 ? pathWithoutLocale : pathWithoutLocale.slice(0, queryInPath);
    return pathOnly.replace(/\/+$/, '') || '/';
}

function visitSearchParam(searchParams: URLSearchParams, name: string): string | undefined {
    const value = searchParams.get(name)?.trim();
    return value ? value : undefined;
}

/**
 * Maps a locale-stripped public pathname to a WebPageKey for session visit
 * tracking. `search` is the query string (`?venueId=…`); a query already on
 * `pathWithoutLocale` is used when `search` is empty (stored / backfill paths).
 * Returns null for admin/profile/workspace routes and unknown paths.
 */
export function webPageKeyFromPath(pathWithoutLocale: string, search = ''): WebPageVisitMatch | null {
    const path = visitPathname(pathWithoutLocale);
    const searchParams = visitSearchParams(pathWithoutLocale, search);

    if (path === '/admin' || path.startsWith('/admin/')) return null;
    if (path === '/profile' || path.startsWith('/profile/')) return null;
    if (path.startsWith('/server/')) return null;

    if (path === '/' || path === '') return { webPageKey: 'LANDING' };
    if (path === '/cities') return { webPageKey: 'CITIES' };
    if (path === '/venues' || path === '/partners') return { webPageKey: 'VENUES' };
    if (path === '/occasions') return { webPageKey: 'OCCASIONS' };
    if (path === '/chefs') return { webPageKey: 'CHEFS' };
    if (path === '/blog-posts') return { webPageKey: 'BLOG_POSTS' };
    if (path === '/about-us') return { webPageKey: 'ABOUT_US' };
    if (path === '/gift-cards' || path === '/gift-card') return { webPageKey: 'GIFT_CARD' };
    if (/^\/gift-card\/[^/]+\/checkout$/.test(path)) return { webPageKey: 'GIFT_CARD' };
    if (path === '/how-to-become-a-chef') return { webPageKey: 'HOW_TO_BECOME_A_CHEF' };
    const foundingChefMatch = /^\/how-to-become-a-chef\/(netherlands|switzerland)$/.exec(path);
    if (foundingChefMatch?.[1]) return { webPageKey: 'FOUNDING_CHEF', params: { countryId: foundingChefMatch[1] } };
    const comingToMatch = /^\/coming-to\/(netherlands|switzerland)$/.exec(path);
    if (comingToMatch?.[1]) return { webPageKey: 'COMING_TO', params: { countryId: comingToMatch[1] } };
    if (path === '/booking-request') return { webPageKey: 'BOOKING_REQUEST' };
    if (path === '/booking-request/form') return { webPageKey: 'BOOKING_REQUEST_FORM' };
    if (path === '/booking-request/chat') return { webPageKey: 'BOOKING_REQUEST_CHAT' };
    if (path === '/booking-request/plan') {
        const venueId = visitSearchParam(searchParams, 'venueId') ?? visitSearchParam(searchParams, 'partnerId');
        return venueId
            ? { webPageKey: 'BOOKING_REQUEST_PLAN', params: { partnerVenueId: venueId } }
            : { webPageKey: 'BOOKING_REQUEST_PLAN' };
    }
    if (path === '/chef-sign-up') return { webPageKey: 'CHEF_SIGN_UP' };
    if (path === '/imprint') return { webPageKey: 'IMPRINT' };
    if (path === '/terms-and-conditions') return { webPageKey: 'TERMS_AND_CONDITIONS' };
    if (path === '/privacy-policy') return { webPageKey: 'PRIVACY_POLICY' };
    if (path === '/log-on' || path === '/sign-in') return { webPageKey: 'SIGN_IN' };

    // Detail routes capture the URL segment; session-event create resolves slug
    // or legacy id to the stable entity id so analytics survive a rename.
    const chefsMatch = /^\/chefs\/([^/]+)$/.exec(path);
    if (chefsMatch?.[1]) return { webPageKey: 'CHEFS', params: { cookId: chefsMatch[1] } };

    const citiesMatch = /^\/cities\/([^/]+)$/.exec(path);
    if (citiesMatch?.[1]) return { webPageKey: 'CITIES', params: { cityId: citiesMatch[1] } };

    const venuesMatch = /^\/venues\/([^/]+)$/.exec(path) ?? /^\/partners\/([^/]+)$/.exec(path);
    if (venuesMatch?.[1]) return { webPageKey: 'VENUES', params: { partnerVenueId: venuesMatch[1] } };

    const occasionsMatch = /^\/occasions\/([^/]+)$/.exec(path);
    if (occasionsMatch?.[1]) return { webPageKey: 'OCCASIONS', params: { occasionId: occasionsMatch[1] } };

    const blogPostsMatch = /^\/blog-posts\/([^/]+)$/.exec(path);
    if (blogPostsMatch?.[1]) return { webPageKey: 'BLOG_POSTS', params: { blogPostId: blogPostsMatch[1] } };

    const bookingSubmittedMatch = /^\/booking-request\/([^/]+)\/submitted$/.exec(path);
    if (bookingSubmittedMatch?.[1]) {
        return { webPageKey: 'BOOKING_REQUEST', params: { bookingRequestId: bookingSubmittedMatch[1] } };
    }

    return null;
}
