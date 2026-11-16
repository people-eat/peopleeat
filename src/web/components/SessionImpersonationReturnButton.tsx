import { Undo2Icon } from 'lucide-react';
import { inlineCopy } from '../../shared';
import type { Locale } from '../../shared';

import { useLocale } from '../hooks/useLocale';
import { useSessionImpersonation } from '../hooks/useSessionImpersonation';
import { DropdownMenuItem } from './base/dropdown-menu';
import { SidebarMenuButton, SidebarMenuItem } from './base/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from './base/tooltip';
import { HeaderButton } from './HeaderButton';

function returnLabel(locale: Locale) {
    return inlineCopy({ de: 'Zurück zur Administration', en: 'Return to administration' }, locale);
}

/** Desktop header icon (PublicSessionNav). */
export function SessionImpersonationReturnHeaderButton() {
    const locale = useLocale();
    const { active, busy, returnToAdmin } = useSessionImpersonation();
    if (!active) return null;

    const label = returnLabel(locale);
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <HeaderButton type="button" size="icon" aria-label={label} disabled={busy} onClick={() => void returnToAdmin()}>
                    <Undo2Icon aria-hidden />
                </HeaderButton>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}

/** Mobile header menu row (HeaderNavMenu). */
export function SessionImpersonationReturnMenuItem() {
    const locale = useLocale();
    const { active, busy, returnToAdmin } = useSessionImpersonation();
    if (!active) return null;

    return (
        <DropdownMenuItem disabled={busy} onSelect={() => void returnToAdmin()}>
            <Undo2Icon aria-hidden />
            {returnLabel(locale)}
        </DropdownMenuItem>
    );
}

/** Profile sidebar footer (CustomerSidebar / CookSidebar). */
export function SessionImpersonationReturnSidebarItem() {
    const locale = useLocale();
    const { active, busy, returnToAdmin } = useSessionImpersonation();
    if (!active) return null;

    return (
        <SidebarMenuItem>
            <SidebarMenuButton type="button" size="sm" disabled={busy} onClick={() => void returnToAdmin()}>
                <Undo2Icon />
                <span>{returnLabel(locale)}</span>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}
