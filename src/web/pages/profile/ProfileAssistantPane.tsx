import { Outlet, useRouterState } from '@tanstack/react-router';
import { PanelLeftIcon } from 'lucide-react';
import { createContext, useContext } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { ASSISTANT_SIDEBAR_WIDTH_DEFAULT_REM } from '../../chat/assistantSidebarWidth';
import { isAssistantFullscreenPath } from '../../chat/isAssistantFullscreenPath';
import { AssistantTriggerButton } from '../../components/AssistantTriggerButton';
import { Button } from '../../components/base/button';
import { SidebarInset, SidebarProvider, useSidebar } from '../../components/base/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/base/tooltip';
import { ProfileAssistantSidebar, profileAssistantTitle } from '../../components/ProfileAssistantSidebar';
import { useLocale } from '../../hooks/useLocale';
import { DEFAULT_LOCALE } from '../../utils/locale';
import type { Locale } from '../../utils/locale';

type ProfileNavSidebar = { toggleSidebar: () => void };

const ProfileNavSidebarContext = createContext<ProfileNavSidebar | null>(null);

/** Outer cook/customer nav — same bridge pattern as `useAdminNavSidebar`. */
export function useProfileNavSidebar(): ProfileNavSidebar {
    const value = useContext(ProfileNavSidebarContext);
    if (!value) {
        throw new Error('useProfileNavSidebar must be used within ProfileAssistantPane.');
    }
    return value;
}

function pathWithoutLocale(pathname: string, locale: Locale): string {
    if (locale !== DEFAULT_LOCALE && pathname.startsWith(`/${locale}/`)) {
        return pathname.slice(locale.length + 1) || '/';
    }
    if (locale !== DEFAULT_LOCALE && pathname === `/${locale}`) {
        return '/';
    }
    return pathname;
}

// Nested provider owns the right-hand assistant independently of the left nav.
// Captures the outer `useSidebar` before nesting so the header nav trigger still
// toggles Cook/CustomerSidebar (nearest provider would otherwise be the assistant).
export function ProfileAssistantPane({
    breadcrumbs,
    insetClassName,
    contentClassName,
    surface,
    assistantEnabled,
    banner,
}: {
    breadcrumbs: ReactNode;
    insetClassName?: string;
    contentClassName: string;
    surface: 'cook' | 'customer';
    assistantEnabled: boolean;
    banner?: ReactNode;
}) {
    const locale = useLocale();
    const navSidebar = useSidebar();
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const path = pathWithoutLocale(pathname, locale);
    const fullscreen = isAssistantFullscreenPath(path);
    const navToggleLabel = { de: 'Seitenleiste umschalten', en: 'Toggle Sidebar' }[locale];
    const assistantToggleLabel = {
        de: `${profileAssistantTitle.de} umschalten`,
        en: `Toggle ${profileAssistantTitle.en}`,
    }[locale];
    const showAssistant = assistantEnabled && !fullscreen;

    return (
        <ProfileNavSidebarContext.Provider value={{ toggleSidebar: navSidebar.toggleSidebar }}>
            <SidebarProvider
                defaultOpen={false}
                enableKeyboardShortcut={false}
                stateCookieName={null}
                className="min-h-0 min-w-0 flex-1"
                style={{ '--sidebar-width': `${ASSISTANT_SIDEBAR_WIDTH_DEFAULT_REM}rem` } as CSSProperties}
            >
                <SidebarInset className={insetClassName}>
                    {fullscreen ? null : (
                        <header className="flex h-12 shrink-0 items-center gap-2 px-4 sm:h-14">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        data-sidebar="trigger"
                                        data-slot="sidebar-trigger"
                                        variant="outline"
                                        size="icon"
                                        className="-ml-1 size-8"
                                        onClick={navSidebar.toggleSidebar}
                                        aria-label={navToggleLabel}
                                    >
                                        <PanelLeftIcon />
                                        <span className="sr-only">{navToggleLabel}</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">{navToggleLabel}</TooltipContent>
                            </Tooltip>
                            <div className="min-w-0 flex-1">{breadcrumbs}</div>
                            {assistantEnabled ? (
                                <AssistantTriggerButton label={assistantToggleLabel} title={profileAssistantTitle[locale]} />
                            ) : null}
                        </header>
                    )}
                    <div className={fullscreen ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : contentClassName}>
                        {banner != null && !fullscreen ? <div className="shrink-0">{banner}</div> : null}
                        <Outlet />
                    </div>
                </SidebarInset>
                {showAssistant ? <ProfileAssistantSidebar surface={surface} /> : null}
            </SidebarProvider>
        </ProfileNavSidebarContext.Provider>
    );
}
