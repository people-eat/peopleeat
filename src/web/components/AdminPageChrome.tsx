import { useRouterState } from '@tanstack/react-router';
import { PanelLeftIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { useLocale } from '../hooks/useLocale';
import type { AdminBreadcrumbCrumb } from '../pages/admin/adminBreadcrumb';
import { adminBreadcrumbsForPath, adminPathWithoutLocale } from '../pages/admin/adminBreadcrumb';
import { useAdminNavSidebar } from '../pages/admin/AdminLayout';
import { cn } from '../utils/cn';
import { adminAssistantTitle } from './AdminAssistantSidebar';
import { AdminBreadcrumbTrail } from './AdminBreadcrumbTrail';
import { AssistantTriggerButton } from './AssistantTriggerButton';
import { Button } from './base/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './base/tooltip';

export function AdminPageChrome({
    crumbs,
    children,
    contentClassName,
}: {
    crumbs: readonly AdminBreadcrumbCrumb[];
    children: ReactNode;
    contentClassName?: string;
}) {
    const locale = useLocale();
    const navSidebar = useAdminNavSidebar();
    const navToggleLabel = { de: 'Seitenleiste umschalten', en: 'Toggle Sidebar' }[locale];
    const assistantToggleLabel = {
        de: `${adminAssistantTitle.de} umschalten`,
        en: `Toggle ${adminAssistantTitle.en}`,
    }[locale];

    return (
        <>
            <header className="flex h-12 shrink-0 items-center gap-2 px-4 sm:h-14">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            data-sidebar="trigger"
                            data-slot="sidebar-trigger"
                            variant="outline"
                            size="icon"
                            className="-ml-1 size-8 shrink-0"
                            onClick={navSidebar.toggleSidebar}
                            aria-label={navToggleLabel}
                        >
                            <PanelLeftIcon />
                            <span className="sr-only">{navToggleLabel}</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{navToggleLabel}</TooltipContent>
                </Tooltip>
                <div className="min-w-0 flex-1">
                    <AdminBreadcrumbTrail crumbs={crumbs} />
                </div>
                <AssistantTriggerButton label={assistantToggleLabel} title={adminAssistantTitle[locale]} />
            </header>
            <div
                data-scroll-restoration-id="workspace-inset"
                className={cn(
                    'workspace-inset-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-2 scrollbar-gutter-stable sm:pt-4',
                    contentClassName,
                )}
            >
                {children}
            </div>
        </>
    );
}

// List / overview / stub pages — path-derived crumbs as props without repeating
// path/locale wiring on every screen.
export function AdminPathPageChrome({ children, contentClassName }: { children: ReactNode; contentClassName?: string }) {
    const locale = useLocale();
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const path = adminPathWithoutLocale(pathname, locale);
    return (
        <AdminPageChrome crumbs={adminBreadcrumbsForPath(path, locale)} contentClassName={contentClassName}>
            {children}
        </AdminPageChrome>
    );
}
