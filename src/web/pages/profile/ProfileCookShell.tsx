import type { CSSProperties, ReactNode } from 'react';

import { SidebarProvider } from '../../components/base/sidebar';
import { CookBreadcrumbs } from '../../components/CookBreadcrumbs';
import { CookSidebar } from '../../components/CookSidebar';
import { ProfileAssistantPane } from './ProfileAssistantPane';

export function ProfileCookShell({
    isAdmin,
    walletBadge,
    poolReviewCount,
    offersUnreadCount,
    assistantEnabled,
    banner,
}: {
    isAdmin: boolean;
    walletBadge: boolean;
    poolReviewCount: number;
    offersUnreadCount: number;
    assistantEnabled: boolean;
    banner?: ReactNode;
}) {
    return (
        <SidebarProvider style={{ '--sidebar-width': '19rem' } as CSSProperties}>
            <CookSidebar
                isAdmin={isAdmin}
                walletBadge={walletBadge}
                poolReviewCount={poolReviewCount}
                offersUnreadCount={offersUnreadCount}
            />
            <ProfileAssistantPane
                insetClassName="h-svh min-h-0 overflow-hidden"
                contentClassName="workspace-inset-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-2 scrollbar-gutter-stable sm:pt-4"
                breadcrumbs={<CookBreadcrumbs />}
                surface="cook"
                assistantEnabled={assistantEnabled}
                banner={banner}
            />
        </SidebarProvider>
    );
}
