import type { WebPageKey } from './webPage';

export type WebPageVisitMatch = {
    webPageKey: WebPageKey;
    params?: {
        cityId?: string;
        cookId?: string;
        blogPostId?: string;
        partnerId?: string;
        occasionId?: string;
        bookingRequestId?: string;
    };
};

/**
 * Maps a locale-stripped public pathname to a WebPageKey for session visit
 * tracking. Returns null for admin/profile/workspace routes and unknown paths.
 */
export function webPageKeyFromPath(pathWithoutLocale: string): WebPageVisitMatch | null {
    const path = pathWithoutLocale.replace(/\/+$/, '') || '/';

    if (path === '/admin' || path.startsWith('/admin/')) return null;
    if (path === '/profile' || path.startsWith('/profile/')) return null;
    if (path.startsWith('/server/')) return null;

    if (path === '/' || path === '') return { webPageKey: 'LANDING' };
    if (path === '/cities') return { webPageKey: 'CITIES' };
    if (path === '/partners') return { webPageKey: 'PARTNERS' };
    if (path === '/occasions') return { webPageKey: 'OCCASIONS' };
    if (path === '/chefs') return { webPageKey: 'CHEFS' };
    if (path === '/blog-posts') return { webPageKey: 'BLOG_POSTS' };
    if (path === '/about-us') return { webPageKey: 'ABOUT_US' };
    if (path === '/gift-cards' || path === '/gift-card') return { webPageKey: 'GIFT_CARD' };
    if (/^\/gift-card\/[^/]+\/checkout$/.test(path)) return { webPageKey: 'GIFT_CARD' };
    if (path === '/how-to-become-a-chef') return { webPageKey: 'HOW_TO_BECOME_A_CHEF' };
    if (path === '/booking-request') return { webPageKey: 'BOOKING_REQUEST' };
    if (path === '/booking-request/form') return { webPageKey: 'BOOKING_REQUEST_FORM' };
    if (path === '/booking-request/chat') return { webPageKey: 'BOOKING_REQUEST_CHAT' };
    if (path === '/chef-sign-up') return { webPageKey: 'CHEF_SIGN_UP' };
    if (path === '/imprint') return { webPageKey: 'IMPRINT' };
    if (path === '/terms-and-conditions') return { webPageKey: 'TERMS_AND_CONDITIONS' };
    if (path === '/privacy-policy') return { webPageKey: 'PRIVACY_POLICY' };
    if (path === '/log-on' || path === '/sign-in') return { webPageKey: 'SIGN_IN' };

    // Chef detail uses a nanoId cookId in the path. Slug-based city/partner/
    // occasion/blog detail pages rely on `path` for identity (no id in URL).
    const chefsMatch = /^\/chefs\/([^/]+)$/.exec(path);
    if (chefsMatch?.[1]) return { webPageKey: 'CHEFS', params: { cookId: chefsMatch[1] } };

    if (/^\/cities\/[^/]+$/.test(path)) return { webPageKey: 'CITIES' };
    if (/^\/partners\/[^/]+$/.test(path)) return { webPageKey: 'PARTNERS' };
    if (/^\/occasions\/[^/]+$/.test(path)) return { webPageKey: 'OCCASIONS' };
    if (/^\/blog-posts\/[^/]+$/.test(path)) return { webPageKey: 'BLOG_POSTS' };

    const bookingSubmittedMatch = /^\/booking-request\/([^/]+)\/submitted$/.exec(path);
    if (bookingSubmittedMatch?.[1]) {
        return { webPageKey: 'BOOKING_REQUEST', params: { bookingRequestId: bookingSubmittedMatch[1] } };
    }

    return null;
}
