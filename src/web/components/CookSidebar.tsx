import { Link, useRouterState } from '@tanstack/react-router';
import { SummaryIcon, UserCogIcon, UserStarIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

import { CookSidebarNavBadgesUpdatesDocument } from '../graphql/generated';
import { useFeatureToggleActive } from '../hooks/useFeatureToggleActive';
import { useLocale } from '../hooks/useLocale';
import { accountPageTitle } from '../pages/accountLabels';
import { adminPageTitle } from '../pages/admin/adminShellLabels';
import { COOK_NAV_ROUTES } from '../pages/profile/cookCatalog';
import type { CookNavSlug } from '../pages/profile/cookCatalog';
import { SITE_LOGO, SITE_LOGO_DISPLAY, SITE_LOGO_SRC_SET, SITE_NAME } from '../seo/seoConstants';
import { DEFAULT_LOCALE } from '../utils/locale';
import type { Locale } from '../utils/locale';
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
import { cookSidebarNavBadgeCountsFromCook } from './cookSidebarNavBadges';

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
    walletBadge: walletBadgeSeed = false,
    poolReviewCount: poolReviewCountSeed = 0,
    offersUnreadCount: offersUnreadCountSeed = 0,
    ...props
}: ComponentProps<typeof Sidebar> & {
    isAdmin: boolean;
    walletBadge?: boolean;
    poolReviewCount?: number;
    offersUnreadCount?: number;
}) {
    const locale = useLocale();
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const path = pathWithoutLocale(pathname, locale);
    const { setOpenMobile } = useSidebar();
    const client = useClient();
    const analyticsEnabled = useFeatureToggleActive('COOK_ANALYTICS');
    const [poolReviewCount, setPoolReviewCount] = useState(poolReviewCountSeed);
    const [offersUnreadCount, setOffersUnreadCount] = useState(offersUnreadCountSeed);
    const [walletBadge, setWalletBadge] = useState(walletBadgeSeed);

    useEffect(() => {
        setOpenMobile(false);
    }, [pathname, setOpenMobile]);

    useEffect(() => {
        setPoolReviewCount(poolReviewCountSeed);
        setOffersUnreadCount(offersUnreadCountSeed);
        setWalletBadge(walletBadgeSeed);
    }, [poolReviewCountSeed, offersUnreadCountSeed, walletBadgeSeed]);

    useEffect(() => {
        const request = createRequest(CookSidebarNavBadgesUpdatesDocument, {});
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const cook = result.data?.userUpdates.cook;
                if (!cook) return;
                const next = cookSidebarNavBadgeCountsFromCook(cook);
                setPoolReviewCount(next.poolReviewCount);
                setOffersUnreadCount(next.offersUnreadCount);
                setWalletBadge(next.walletBadge);
            }),
        );
        return unsubscribe;
    }, [client]);

    const walletAttentionLabel = { de: 'Wallet-Einrichtung unvollständig', en: 'Wallet setup incomplete' }[locale];

    const navItems: {
        title: string;
        to: CookNavTo;
        icon: ReactNode;
        isActive: boolean;
        walletAttention?: boolean;
        count?: number;
        countLabel?: string;
    }[] = [
        {
            title: { de: 'Übersicht', en: 'Overview' }[locale],
            to: '/{-$locale}/profile',
            icon: <SummaryIcon />,
            isActive: path === '/profile',
        },
        ...COOK_NAV_ROUTES.filter((route) => route.slug !== 'analytics' || analyticsEnabled).map((route) => {
            const Icon = route.icon;
            const poolCount = route.slug === 'booking-request-pool' ? poolReviewCount : undefined;
            const offersCount = route.slug === 'booking-request-offers' ? offersUnreadCount : undefined;
            const count = poolCount ?? offersCount;
            return {
                title: route.title[locale],
                to: route.to,
                icon: <Icon />,
                isActive: path === route.path || path.startsWith(`${route.path}/`),
                walletAttention: route.slug === 'wallet' ? walletBadge : false,
                count: count != null && count > 0 ? count : undefined,
                countLabel:
                    count != null && count > 0
                        ? route.slug === 'booking-request-pool'
                            ? {
                                  de: `${count} Anfragen zur Prüfung`,
                                  en: `${count} requests to review`,
                              }[locale]
                            : {
                                  de: `${count} ungelesene Benachrichtigungen`,
                                  en: `${count} unread notifications`,
                              }[locale]
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
                                {item.walletAttention ? (
                                    <SidebarMenuBadge className="bg-transparent p-0 text-transparent peer-hover/menu-button:text-transparent peer-data-[active=true]/menu-button:text-transparent">
                                        <StatusBadge tone="warning" label={walletAttentionLabel} />
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
                    {isAdmin ? (
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild size="sm">
                                <Link to="/{-$locale}/admin">
                                    <UserStarIcon />
                                    <span>{adminPageTitle[locale]}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ) : null}
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild size="sm" isActive={path === '/profile/account'}>
                            <Link to="/{-$locale}/profile/account">
                                <UserCogIcon />
                                <span>{accountPageTitle[locale]}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
