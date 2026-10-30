import { Link, useRouterState } from '@tanstack/react-router';
import { SummaryIcon, UserCogIcon, UserStarIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { createRequest, useClient } from 'urql';
import { pipe, subscribe } from 'wonka';

import { CustomerSidebarNavBadgesUpdatesDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { accountPageTitle } from '../pages/accountLabels';
import { adminPageTitle } from '../pages/admin/adminShellLabels';
import { CUSTOMER_NAV_ROUTES } from '../pages/profile/customerCatalog';
import type { CustomerNavSlug } from '../pages/profile/customerCatalog';
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

function pathWithoutLocale(pathname: string, locale: Locale): string {
    if (locale !== DEFAULT_LOCALE && pathname.startsWith(`/${locale}/`)) {
        return pathname.slice(locale.length + 1) || '/';
    }
    if (locale !== DEFAULT_LOCALE && pathname === `/${locale}`) {
        return '/';
    }
    return pathname;
}

type CustomerNavTo = '/{-$locale}/profile' | `/{-$locale}/profile/${CustomerNavSlug}`;

export function CustomerSidebar({
    isAdmin,
    supportUnreadCount: supportUnreadCountSeed = 0,
    ...props
}: ComponentProps<typeof Sidebar> & {
    isAdmin: boolean;
    supportUnreadCount?: number;
}) {
    const locale = useLocale();
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const path = pathWithoutLocale(pathname, locale);
    const { setOpenMobile } = useSidebar();
    const client = useClient();
    const [supportUnreadCount, setSupportUnreadCount] = useState(supportUnreadCountSeed);

    useEffect(() => {
        setOpenMobile(false);
    }, [pathname, setOpenMobile]);

    useEffect(() => {
        setSupportUnreadCount(supportUnreadCountSeed);
    }, [supportUnreadCountSeed]);

    useEffect(() => {
        const request = createRequest(CustomerSidebarNavBadgesUpdatesDocument, {});
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const counts = result.data?.userUpdates.attentionCounts;
                if (!counts) return;
                setSupportUnreadCount(counts.supportRequestUnreadCount);
            }),
        );
        return unsubscribe;
    }, [client]);

    const overviewItem = {
        title: { de: 'Übersicht', en: 'Overview' }[locale],
        to: '/{-$locale}/profile' as const,
        icon: <SummaryIcon />,
        isActive: path === '/profile',
        count: undefined as number | undefined,
        countLabel: undefined as string | undefined,
    };

    const catalogItems = CUSTOMER_NAV_ROUTES.map((route) => {
        const Icon = route.icon;
        const count = route.slug === 'support-requests' && supportUnreadCount > 0 ? supportUnreadCount : undefined;
        return {
            title: route.title[locale],
            to: route.to,
            icon: <Icon />,
            isActive: path === route.path || path.startsWith(`${route.path}/`),
            count,
            countLabel:
                count != null
                    ? {
                          de: `${count} ungelesene Support-Nachrichten`,
                          en: `${count} unread support messages`,
                      }[locale]
                    : undefined,
        };
    });

    const navItems: {
        title: string;
        to: CustomerNavTo;
        icon: ReactNode;
        isActive: boolean;
        count?: number;
        countLabel?: string;
    }[] = [overviewItem, ...catalogItems];

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
