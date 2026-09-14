import { useRouterState } from '@tanstack/react-router';
import type { CSSProperties, ReactNode } from 'react';

import { SidebarProvider } from '../../components/base/sidebar';
import { CookAccessDenied } from '../../components/CookAccessDenied';
import { CustomerBreadcrumbs } from '../../components/CustomerBreadcrumbs';
import { CustomerSidebar } from '../../components/CustomerSidebar';
import { useLocale } from '../../hooks/useLocale';
import { DEFAULT_LOCALE } from '../../utils/locale';
import type { Locale } from '../../utils/locale';
import { ProfileAssistantPane } from './ProfileAssistantPane';

function pathWithoutLocale(pathname: string, locale: Locale): string {
    if (locale !== DEFAULT_LOCALE && pathname.startsWith(`/${locale}/`)) {
        return pathname.slice(locale.length + 1) || '/';
    }
    if (locale !== DEFAULT_LOCALE && pathname === `/${locale}`) {
        return '/';
    }
    return pathname;
}

export function ProfileCustomerShell({
    isAdmin,
    supportUnreadCount = 0,
    assistantEnabled,
    banner,
}: {
    isAdmin: boolean;
    supportUnreadCount?: number;
    assistantEnabled: boolean;
    banner?: ReactNode;
}) {
    const locale = useLocale();
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const path = pathWithoutLocale(pathname, locale);
    const isCustomerBookingRequestPath = /^\/profile\/booking-requests(\/[^/]+(\/(edit|offers\/[^/]+(\/checkout)?))?)?$/.test(path);
    const isCustomerSupportPath = /^\/profile\/support-requests(\/[^/]+)?$/.test(path);
    const isCustomerGiftCardsPath = path === '/profile/gift-cards';
    const isCustomerAssistantPath = /^\/profile\/assistant(\/[^/]+)?$/.test(path);
    const isCustomerPath =
        path === '/profile' ||
        path === '/profile/account' ||
        isCustomerBookingRequestPath ||
        isCustomerSupportPath ||
        isCustomerGiftCardsPath ||
        isCustomerAssistantPath;

    if (!isCustomerPath) {
        return <CookAccessDenied />;
    }

    return (
        <SidebarProvider style={{ '--sidebar-width': '19rem' } as CSSProperties}>
            <CustomerSidebar isAdmin={isAdmin} supportUnreadCount={supportUnreadCount} />
            <ProfileAssistantPane
                insetClassName="h-svh min-h-0 overflow-hidden"
                contentClassName="workspace-inset-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-2 scrollbar-gutter-stable sm:pt-4"
                breadcrumbs={<CustomerBreadcrumbs />}
                surface="customer"
                assistantEnabled={assistantEnabled}
                banner={banner}
            />
        </SidebarProvider>
    );
}
