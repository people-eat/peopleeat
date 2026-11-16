import { t } from '../../../i18n/t';
import type { GqlCChatSurface } from '../../graphql/generated';
import type { Locale } from '../../utils/locale';

export type AdminAssistantChatsSection = 'list';

export const ADMIN_ASSISTANT_CHATS_SECTIONS: AdminAssistantChatsSection[] = ['list'];

export type AdminAssistantChatsSectionTo = '/{-$locale}/admin/assistant-chats/list';

export function adminAssistantChatsSectionLabel(section: AdminAssistantChatsSection, locale: Locale): string {
    return t(locale, 'admin', `section.${section}`);
}

export function adminAssistantChatsSectionPath(
    section: AdminAssistantChatsSection,
): `/admin/assistant-chats/${AdminAssistantChatsSection}` {
    return `/admin/assistant-chats/${section}`;
}

export function adminAssistantChatsSectionTo(section: AdminAssistantChatsSection): AdminAssistantChatsSectionTo {
    return `/{-$locale}/admin/assistant-chats/${section}`;
}

export function parseAdminAssistantChatsSectionFromPath(path: string): AdminAssistantChatsSection | undefined {
    for (const section of ADMIN_ASSISTANT_CHATS_SECTIONS) {
        if (path === adminAssistantChatsSectionPath(section)) {
            return section;
        }
    }
    return undefined;
}

export function adminChatSurfaceLabel(surface: GqlCChatSurface, locale: Locale): string {
    return t(locale, 'admin', `assistantChats.surfaces.${surface}`);
}

export function adminAssistantChatTitle(title: string, locale: Locale): string {
    const trimmed = title.trim();
    if (trimmed.length > 0) return trimmed;
    return t(locale, 'admin', 'copy.untitledChat');
}
