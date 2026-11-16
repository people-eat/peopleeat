import { t } from '../../i18n/t';
import type { Locale } from '../utils/locale';
import { assistantEmptySuggestions } from './assistantSidebarCopy';
import type { AssistantSidebarSurface } from './assistantSidebarCopy';

/**
 * Empty-state suggestion chips: page-aware chip first (when matched), then the
 * static surface starters, ending with “What can you do?”. Labels are sent
 * verbatim on tap.
 */
export function assistantSidebarSuggestions(surface: AssistantSidebarSurface, pathWithoutLocale: string, locale: Locale): string[] {
    const base = assistantEmptySuggestions(surface, locale);
    const contextual = contextualSuggestion(surface, pathWithoutLocale, locale);
    if (!contextual) return base;

    const meta = base[base.length - 1]!;
    const starters = base.slice(0, -1);
    const withoutDup = starters.filter((chip) => chip !== contextual);
    return [contextual, ...withoutDup, meta];
}

function contextualSuggestion(surface: AssistantSidebarSurface, path: string, locale: Locale): string | null {
    if (surface === 'admin') {
        if (path.startsWith('/admin/support') || path.includes('/support-request')) {
            return t(locale, 'common', 'assistantSidebar.suggest.adminSupport');
        }
        if (path.startsWith('/admin/users') || path.startsWith('/admin/user/')) {
            return t(locale, 'common', 'assistantSidebar.suggest.adminUsers');
        }
        if (path.includes('cook') || path.includes('approval')) {
            return t(locale, 'common', 'assistantSidebar.suggest.adminCookApprovals');
        }
        return null;
    }

    if (surface === 'cook') {
        if (path.includes('/meal')) {
            return t(locale, 'common', 'assistantSidebar.suggest.cookMeals');
        }
        if (path.includes('/menu')) {
            return t(locale, 'common', 'assistantSidebar.suggest.cookMenus');
        }
        if (path.includes('/booking-request') || path.includes('/offer')) {
            return t(locale, 'common', 'assistantSidebar.suggest.cookRequests');
        }
        if (path.includes('/travel')) {
            return t(locale, 'common', 'assistantSidebar.suggest.cookTravel');
        }
        if (path.includes('/profile') || path.includes('/chef')) {
            return t(locale, 'common', 'assistantSidebar.suggest.cookProfile');
        }
        return null;
    }

    if (path.includes('/booking-request')) {
        return t(locale, 'common', 'assistantSidebar.suggest.customerBooking');
    }
    if (path.includes('/chef') || path.includes('/cook')) {
        return t(locale, 'common', 'assistantSidebar.suggest.customerChef');
    }
    if (path.includes('/support')) {
        return t(locale, 'common', 'assistantSidebar.suggest.customerSupport');
    }
    return null;
}
