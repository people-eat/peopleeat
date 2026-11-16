import { t } from '../../i18n/t';
import type { Locale } from '../utils/locale';

export type AssistantSidebarSurface = 'admin' | 'customer' | 'cook';

export function assistantSidebarLabel(
    key:
        | 'defaultTitle'
        | 'newChatTitle'
        | 'allChatsTitle'
        | 'untitledChat'
        | 'close'
        | 'allChats'
        | 'newChat'
        | 'backToChat'
        | 'emptyList'
        | 'loadMore'
        | 'loadError'
        | 'listError'
        | 'leaveRunningTitle'
        | 'leaveRunningDescription'
        | 'leaveRunningConfirm'
        | 'jumpToLatest'
        | 'openFullscreen'
        | 'rename'
        | 'renameTitle'
        | 'renameSave'
        | 'renamePlaceholder'
        | 'delete'
        | 'deleteTitle'
        | 'deleteDescription'
        | 'deleteConfirm'
        | 'continueLast'
        | 'chatActions'
        | 'searchPlaceholder'
        | 'searchEmpty'
        | 'resize',
    locale: Locale,
): string {
    return t(locale, 'common', `assistantSidebar.${key}`);
}

export function assistantEmptyBlurb(surface: AssistantSidebarSurface, locale: Locale): string {
    return t(locale, 'common', `assistantSidebar.empty.${surface}.blurb`);
}

export function assistantEmptySuggestions(surface: AssistantSidebarSurface, locale: Locale): string[] {
    return [
        t(locale, 'common', `assistantSidebar.empty.${surface}.s0`),
        t(locale, 'common', `assistantSidebar.empty.${surface}.s1`),
        t(locale, 'common', `assistantSidebar.empty.${surface}.s2`),
    ];
}
