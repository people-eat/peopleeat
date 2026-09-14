import type { AssistantSidebarSurface } from './assistantSidebarCopy';

export type AssistantChatIndexTo = '/{-$locale}/admin/assistant' | '/{-$locale}/profile/assistant';
export type AssistantChatDetailTo = '/{-$locale}/admin/assistant/$chatId' | '/{-$locale}/profile/assistant/$chatId';

export function assistantChatIndexTo(surface: AssistantSidebarSurface): AssistantChatIndexTo {
    return surface === 'admin' ? '/{-$locale}/admin/assistant' : '/{-$locale}/profile/assistant';
}

export function assistantChatDetailTo(surface: AssistantSidebarSurface): AssistantChatDetailTo {
    return surface === 'admin' ? '/{-$locale}/admin/assistant/$chatId' : '/{-$locale}/profile/assistant/$chatId';
}
