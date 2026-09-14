import type { Locale } from '../utils/locale';
import { ASSISTANT_EMPTY_COPY } from './assistantSidebarCopy';
import type { AssistantSidebarSurface } from './assistantSidebarCopy';

type Localized = Record<Locale, string>;

/**
 * Empty-state suggestion chips: page-aware chip first (when matched), then the
 * static surface starters, ending with “What can you do?”. Labels are sent
 * verbatim on tap.
 */
export function assistantSidebarSuggestions(surface: AssistantSidebarSurface, pathWithoutLocale: string): Localized[] {
    const base = ASSISTANT_EMPTY_COPY[surface].suggestions;
    const contextual = contextualSuggestion(surface, pathWithoutLocale);
    if (!contextual) return base;

    const meta = base[base.length - 1]!;
    const starters = base.slice(0, -1);
    const withoutDup = starters.filter((chip) => chip.en !== contextual.en && chip.de !== contextual.de);
    return [contextual, ...withoutDup, meta];
}

function contextualSuggestion(surface: AssistantSidebarSurface, path: string): Localized | null {
    if (surface === 'admin') {
        if (path.startsWith('/admin/support') || path.includes('/support-request')) {
            return { de: 'Offene Support-Anfragen zeigen', en: 'Show open support requests' };
        }
        if (path.startsWith('/admin/users') || path.startsWith('/admin/user/')) {
            return { de: 'Nutzer per E-Mail finden', en: 'Find a user by email' };
        }
        if (path.includes('cook') || path.includes('approval')) {
            return { de: 'Offene Koch-Freigaben zeigen', en: 'Show pending cook approvals' };
        }
        return null;
    }

    if (surface === 'cook') {
        if (path.includes('/meal')) {
            return { de: 'Hilf mir bei meinen Gerichten', en: 'Help me with my meals' };
        }
        if (path.includes('/menu')) {
            return { de: 'Hilf mir bei meinen Menüs', en: 'Help me with my menus' };
        }
        if (path.includes('/booking-request') || path.includes('/offer')) {
            return { de: 'Offene Anfragen zeigen', en: 'Show open requests' };
        }
        if (path.includes('/travel')) {
            return { de: 'Reisegebiet erklären', en: 'Explain my travel area' };
        }
        if (path.includes('/profile') || path.includes('/chef')) {
            return { de: 'Mein Profil verbessern', en: 'Improve my profile' };
        }
        return null;
    }

    // customer
    if (path.includes('/booking-request')) {
        return { de: 'Buchungsanfrage starten', en: 'Start a booking request' };
    }
    if (path.includes('/chef') || path.includes('/cook')) {
        return { de: 'Koch in meiner Stadt finden', en: 'Find a chef in my city' };
    }
    if (path.includes('/support')) {
        return { de: 'Support-Anfrage starten', en: 'Start a support request' };
    }
    return null;
}
