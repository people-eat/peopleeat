import { Outlet, useRouterState } from '@tanstack/react-router';
import { createContext, lazy, Suspense, useContext, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import { ASSISTANT_SIDEBAR_WIDTH_DEFAULT_REM } from '../../chat/assistantSidebarWidth';
import { isAssistantFullscreenPath } from '../../chat/isAssistantFullscreenPath';
import { AdminSidebar } from '../../components/AdminSidebar';
import { SidebarInset, SidebarProvider, useSidebar } from '../../components/base/sidebar';
import type { GqlCAdminPageQuery } from '../../graphql/generated';
import { FeatureToggleAdminShellProvider, FeatureToggleKeysProvider } from '../../hooks/useFeatureToggleActive';
import { useLocale } from '../../hooks/useLocale';
import { DEFAULT_LOCALE } from '../../utils/locale';
import type { Locale } from '../../utils/locale';

function pathWithoutLocale(pathname: string, locale: Locale): string {
    if (locale !== DEFAULT_LOCALE && pathname.startsWith(`/${locale}/`)) {
        return pathname.slice(locale.length + 1) || '/';
    }
    if (locale !== DEFAULT_LOCALE && pathname === `/${locale}`) {
        return '/';
    }
    return pathname;
}

const AdminAssistantSidebar = lazy(async () => {
    const mod = await import('../../components/AdminAssistantSidebar');
    return { default: mod.AdminAssistantSidebar };
});

// Bridges the outer (nav) sidebar across the nested assistant provider so
// `AdminPageChrome` can toggle `AdminSidebar` without the nearest context
// being the assistant rail — same pattern as `ProfileAssistantPane`.
type AdminNavSidebar = { toggleSidebar: () => void };

const AdminNavSidebarContext = createContext<AdminNavSidebar | null>(null);

export function useAdminNavSidebar(): AdminNavSidebar {
    const value = useContext(AdminNavSidebarContext);
    if (!value) {
        throw new Error('useAdminNavSidebar must be used within AdminLayout.');
    }
    return value;
}

// Admin layout — parent `/admin` loader redirects unsigned visitors to sign-in
// (with returnTo) and signed-in non-admins to profile; admins get the shell.
// Inset header + breadcrumbs are owned by each page via AdminPageChrome /
// AdminPathPageChrome; the assistant rail is always available — see
// `docs/features/admin-shell.md`.

export function AdminLayout({ loaderData }: { loaderData: GqlCAdminPageQuery }) {
    const supportUnreadCount = loaderData.currentSession.user?.admin?.unreadSupportRequestsCounts[0] ?? 0;
    const offerChatReviewCount = loaderData.currentSession.user?.admin?.pendingOfferChatReviewsCounts[0] ?? 0;
    const whatsAppUnreadCount = loaderData.currentSession.user?.admin?.whatsAppConversationsAdminUnreadCount ?? 0;
    const activeFeatureToggleKeys = loaderData.currentSession.activeFeatureToggleKeys;

    return (
        <FeatureToggleAdminShellProvider value={true}>
            <FeatureToggleKeysProvider value={activeFeatureToggleKeys}>
                <SidebarProvider style={{ '--sidebar-width': '19rem' } as CSSProperties}>
                    <AdminSidebar
                        supportUnreadCount={supportUnreadCount}
                        offerChatReviewCount={offerChatReviewCount}
                        whatsAppUnreadCount={whatsAppUnreadCount}
                    />
                    <AdminAssistantPane />
                </SidebarProvider>
            </FeatureToggleKeysProvider>
        </FeatureToggleAdminShellProvider>
    );
}

function AdminAssistantPane() {
    const navSidebar = useSidebar();
    const locale = useLocale();
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const fullscreen = isAssistantFullscreenPath(pathWithoutLocale(pathname, locale));

    return (
        <AdminNavSidebarContext.Provider value={{ toggleSidebar: navSidebar.toggleSidebar }}>
            <SidebarProvider
                defaultOpen={false}
                enableKeyboardShortcut={false}
                stateCookieName={null}
                className="min-h-0 min-w-0 flex-1"
                style={{ '--sidebar-width': `${ASSISTANT_SIDEBAR_WIDTH_DEFAULT_REM}rem` } as CSSProperties}
            >
                <SidebarInset className="h-svh min-h-0 overflow-hidden">
                    <Outlet />
                </SidebarInset>
                {fullscreen ? null : <DeferredAdminAssistantSidebar />}
            </SidebarProvider>
        </AdminNavSidebarContext.Provider>
    );
}

// Streamdown lives behind the admin assistant. Keep that chunk off the
// critical path until the rail is opened at least once in this session.
function DeferredAdminAssistantSidebar() {
    const { open, isMobile, openMobile } = useSidebar();
    const [shouldLoad, setShouldLoad] = useState(false);

    useEffect(() => {
        if (open || (isMobile && openMobile)) {
            setShouldLoad(true);
        }
    }, [open, isMobile, openMobile]);

    if (!shouldLoad) {
        return null;
    }

    return (
        <Suspense fallback={null}>
            <AdminAssistantSidebar />
        </Suspense>
    );
}
