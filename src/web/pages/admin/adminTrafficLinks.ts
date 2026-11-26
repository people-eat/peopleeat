import { t } from '../../../i18n/t';
import { localePath } from '../../../shared/locale';
import {
    WEB_PAGE_VISIT_INDEX_RANK_ID,
    webPageKeyPublicPathByKey,
    webPageKeysAnalyticsFunnel,
    webPageVisitEntityPublicPath,
    webPageVisitEntityUsesPartnerVenue,
} from '../../../shared/webPage';
import type { WebPageKey, WebPageKeyTracked, WebPageKeyWithVisitEntity } from '../../../shared/webPage';
import type { Locale } from '../../utils/locale';

export type AdminTrafficLink = {
    href?: string;
    to?: string;
    params?: Record<string, string>;
    search?: Record<string, unknown>;
    label: string;
};

export function adminTrafficViewsPerSession(pageviews: number, uniqueSessions: number): string {
    if (uniqueSessions <= 0) return '0';
    return (pageviews / uniqueSessions).toFixed(1);
}

export function adminTrafficChangePercent(current: number, previous: number, locale: Locale): string {
    if (previous <= 0) return current > 0 ? t(locale, 'admin', 'traffic.newVsPrevious') : '0%';
    const percent = Math.round(((current - previous) / previous) * 100);
    return `${percent}%`;
}

function adminTrafficPublicPageHref(
    locale: Locale,
    webPageKey: WebPageKeyTracked,
    pathName?: string | null,
    entityId?: string | null,
): string {
    if (entityId === WEB_PAGE_VISIT_INDEX_RANK_ID || (!pathName && !entityId)) {
        return localePath(locale, webPageKeyPublicPathByKey[webPageKey]);
    }
    if (webPageKey === 'BOOKING_REQUEST_PLAN' && entityId) {
        return localePath(locale, webPageVisitEntityPublicPath('BOOKING_REQUEST_PLAN', entityId));
    }
    if (pathName && webPageKey === 'CITIES') return localePath(locale, webPageVisitEntityPublicPath('CITIES', pathName));
    if (pathName && webPageKey === 'VENUES') return localePath(locale, webPageVisitEntityPublicPath('VENUES', pathName));
    if (pathName && webPageKey === 'CHEFS') return localePath(locale, webPageVisitEntityPublicPath('CHEFS', pathName));
    if (pathName && webPageKey === 'OCCASIONS') return localePath(locale, webPageVisitEntityPublicPath('OCCASIONS', pathName));
    if (pathName && webPageKey === 'BLOG_POSTS') return localePath(locale, webPageVisitEntityPublicPath('BLOG_POSTS', pathName));
    return localePath(locale, webPageKeyPublicPathByKey[webPageKey]);
}

export function adminTrafficPageKeyActions(
    locale: Locale,
    webPageKey: WebPageKey,
    range: { from: string; to: string },
): AdminTrafficLink[] {
    if (webPageKey === 'PROFILE' || webPageKey === 'ADMINISTRATION') return [];
    const tracked = webPageKey as WebPageKeyTracked;
    const links: AdminTrafficLink[] = [
        { href: adminTrafficPublicPageHref(locale, tracked), label: t(locale, 'admin', 'traffic.viewPage') },
        { to: '/{-$locale}/admin/web-pages/$webPageKey', params: { webPageKey }, label: t(locale, 'admin', 'traffic.viewSeo') },
    ];
    if ((webPageKeysAnalyticsFunnel as readonly string[]).includes(webPageKey)) {
        links.push({
            to: '/{-$locale}/admin/analytics',
            search: { from: range.from, to: range.to },
            label: t(locale, 'admin', 'traffic.viewAnalytics'),
        });
    }
    return links;
}

export function adminTrafficEntityActions(
    locale: Locale,
    focusedKey: WebPageKeyWithVisitEntity,
    row: { id: string; pathName: string | null },
): AdminTrafficLink[] {
    const links: AdminTrafficLink[] = [
        {
            href: adminTrafficPublicPageHref(locale, focusedKey, row.pathName, row.id),
            label: t(locale, 'admin', 'traffic.viewPage'),
        },
    ];
    if (row.id === WEB_PAGE_VISIT_INDEX_RANK_ID) return links;
    if (focusedKey === 'CITIES') {
        links.push({
            to: '/{-$locale}/admin/cities/$cityId',
            params: { cityId: row.id },
            label: t(locale, 'admin', 'traffic.editRecord'),
        });
    } else if (webPageVisitEntityUsesPartnerVenue(focusedKey)) {
        links.push({
            to: '/{-$locale}/admin/partner-venues/$partnerVenueId',
            params: { partnerVenueId: row.id },
            label: t(locale, 'admin', 'traffic.editRecord'),
        });
    } else if (focusedKey === 'CHEFS') {
        links.push({
            to: '/{-$locale}/admin/users/$userId',
            params: { userId: row.id },
            search: { tab: 'cook-profile' },
            label: t(locale, 'admin', 'traffic.editRecord'),
        });
    } else if (focusedKey === 'OCCASIONS') {
        links.push({
            to: '/{-$locale}/admin/occasions/$occasionId',
            params: { occasionId: row.id },
            label: t(locale, 'admin', 'traffic.editRecord'),
        });
    } else {
        links.push({
            to: '/{-$locale}/admin/blog-posts/$blogPostId',
            params: { blogPostId: row.id },
            label: t(locale, 'admin', 'traffic.editRecord'),
        });
    }
    return links;
}

export function adminTrafficAddEntityLabel(locale: Locale, key: WebPageKeyWithVisitEntity): string {
    if (key === 'CITIES') return t(locale, 'admin', 'traffic.addCity');
    if (webPageVisitEntityUsesPartnerVenue(key)) return t(locale, 'admin', 'traffic.addVenue');
    if (key === 'CHEFS') return t(locale, 'admin', 'traffic.addChef');
    if (key === 'OCCASIONS') return t(locale, 'admin', 'traffic.addOccasion');
    return t(locale, 'admin', 'traffic.addBlogPost');
}
