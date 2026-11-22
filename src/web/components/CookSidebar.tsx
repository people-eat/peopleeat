import { Link, useRouterState } from '@tanstack/react-router';
import { SummaryIcon, UserCogIcon, UserStarIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../i18n/t';
import { CookSidebarNavBadgesUpdatesDocument } from '../graphql/generated';
import { useFeatureToggleActive } from '../hooks/useFeatureToggleActive';
import { useLocale } from '../hooks/useLocale';
import { useSessionImpersonation } from '../hooks/useSessionImpersonation';
import { accountPageTitle } from '../pages/accountLabels';
import { adminPageTitle } from '../pages/admin/adminShellLabels';
import type { CookNavSlug } from '../pages/profile/cookCatalog';
import { COOK_NAV_ROUTES } from '../pages/profile/cookCatalog';
import { SITE_LOGO, SITE_LOGO_DISPLAY, SITE_LOGO_SRC_SET, SITE_NAME } from '../seo/seoConstants';
import type { Locale } from '../utils/locale';
import { DEFAULT_LOCALE } from '../utils/locale';
import { AppImage } from './AppImage';
import { NotificationBadge } from './base/notification-badge';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
    useSidebar,
} from './base/sidebar';
import { StatusBadge } from './base/status-badge';
import { SessionImpersonationReturnSidebarItem } from './SessionImpersonationReturnButton';

function pathWithoutLocale(pathname: string, locale: Locale): string {
    if (locale !== DEFAULT_LOCALE && pathname.startsWith(`/${locale}/`)) {
        return pathname.slice(locale.length + 1) || '/';
    }
    if (locale !== DEFAULT_LOCALE && pathname === `/${locale}`) {
        return '/';
    }
    return pathname;
}

type CookNavTo = '/{-$locale}/profile' | `/{-$locale}/profile/${CookNavSlug}`;

export function CookSidebar({
    isAdmin,
    financesBadge: financesBadgeSeed = false,
    poolReviewCount: poolReviewCountSeed = 0,
    offersUnreadCount: offersUnreadCountSeed = 0,
    ...props
}: ComponentProps<typeof Sidebar> & {
    isAdmin: boolean;
    financesBadge?: boolean;
    poolReviewCount?: number;
    offersUnreadCount?: number;
}) {
    const locale = useLocale();
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const path = pathWithoutLocale(pathname, locale);
    const { setOpenMobile } = useSidebar();
    const client = useClient();
    const { active: impersonating } = useSessionImpersonation();
    const analyticsEnabled = useFeatureToggleActive('COOK_ANALYTICS');
    const inviteEnabled = useFeatureToggleActive('COOK_INVITE');
    const offerAddonsEnabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_ADDONS');
    const [poolReviewCount, setPoolReviewCount] = useState(poolReviewCountSeed);
    const [offersUnreadCount, setOffersUnreadCount] = useState(offersUnreadCountSeed);
    const [financesBadge, setFinancesBadge] = useState(financesBadgeSeed);

    useEffect(() => {
        setOpenMobile(false);
    }, [pathname, setOpenMobile]);

    useEffect(() => {
        setPoolReviewCount(poolReviewCountSeed);
        setOffersUnreadCount(offersUnreadCountSeed);
        setFinancesBadge(financesBadgeSeed);
    }, [poolReviewCountSeed, offersUnreadCountSeed, financesBadgeSeed]);

    useEffect(() => {
        const request = createRequest(CookSidebarNavBadgesUpdatesDocument, {});
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const counts = result.data?.userUpdates.cook?.attentionCounts;
                if (!counts) return;
                setPoolReviewCount(counts.bookingRequestPoolCount);
                setOffersUnreadCount(counts.bookingRequestOfferUnreadCount);
                setFinancesBadge(counts.walletNeedsAttention);
            }),
        );
        return unsubscribe;
    }, [client]);

    const financesAttentionLabel = t(locale, 'profileCook', 'chrome.financesIncomplete');

    const navItems: {
        title: string;
        to: CookNavTo;
        icon: ReactNode;
        isActive: boolean;
        financesAttention?: boolean;
        count?: number;
        countLabel?: string;
    }[] = [
        {
            title: t(locale, 'profile', 'chrome.overview'),
            to: '/{-$locale}/profile',
            icon: <SummaryIcon />,
            isActive: path === '/profile',
        },
        ...COOK_NAV_ROUTES.filter((route) => {
            if (route.slug === 'analytics') return analyticsEnabled;
            if (route.slug === 'invite') return inviteEnabled;
            if (route.slug === 'offer-addons') return offerAddonsEnabled;
            return true;
        }).map((route) => {
            const Icon = route.icon;
            const poolCount = route.slug === 'booking-request-pool' ? poolReviewCount : undefined;
            const offersCount = route.slug === 'booking-request-offers' ? offersUnreadCount : undefined;
            const count = poolCount ?? offersCount;
            return {
                title: route.title(locale),
                to: route.to,
                icon: <Icon />,
                isActive: path === route.path || path.startsWith(`${route.path}/`),
                financesAttention: route.slug === 'finances' ? financesBadge : false,
                count: count != null && count > 0 ? count : undefined,
                countLabel:
                    count != null && count > 0
                        ? t(
                              locale,
                              'profileCook',
                              route.slug === 'booking-request-pool' ? 'chrome.poolReviewCount' : 'chrome.offersUnreadCount',
                              { count },
                          )
                        : undefined,
            };
        }),
    ];

    return (
        <Sidebar variant="floating" {...props}>
            <SidebarHeader>
                <Link to="/{-$locale}" className="flex items-center rounded-md p-2 outline-hidden ring-sidebar-ring focus-visible:ring-2">
                    <AppImage
                        src={SITE_LOGO}
                        srcSet={SITE_LOGO_SRC_SET}
                        alt={SITE_NAME}
                        width={SITE_LOGO_DISPLAY.width}
                        height={SITE_LOGO_DISPLAY.height}
                        className="h-7 w-auto"
                    />
                </Link>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                        {navItems.map((item) => (
                            <SidebarMenuItem key={item.to}>
                                <SidebarMenuButton asChild isActive={item.isActive}>
                                    <Link to={item.to}>
                                        {item.icon}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                                {item.financesAttention ? (
                                    <SidebarMenuBadge className="bg-transparent p-0 text-transparent peer-hover/menu-button:text-transparent peer-data-[active=true]/menu-button:text-transparent">
                                        <StatusBadge tone="warning" label={financesAttentionLabel} />
                                    </SidebarMenuBadge>
                                ) : null}
                                {item.count != null && item.countLabel != null ? (
                                    <SidebarMenuBadge className="bg-transparent p-0 text-transparent peer-hover/menu-button:text-transparent peer-data-[active=true]/menu-button:text-transparent">
                                        <NotificationBadge count={item.count} label={item.countLabel} placement="inline" />
                                    </SidebarMenuBadge>
                                ) : null}
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarSeparator />
            <SidebarFooter>
                <SidebarMenu>
                    {impersonating ? (
                        <SessionImpersonationReturnSidebarItem />
                    ) : isAdmin ? (
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild size="sm">
                                <Link to="/{-$locale}/admin">
                                    <UserStarIcon />
                                    <span>{adminPageTitle(locale)}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ) : null}
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild size="sm" isActive={path === '/profile/account'}>
                            <Link to="/{-$locale}/profile/account">
                                <UserCogIcon />
                                <span>{accountPageTitle(locale)}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
