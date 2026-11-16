import type { Locale } from '../utils/locale';
import { assistantSidebarLabel } from './assistantSidebarCopy';

/** List/header title; empty server title → localized untitled label. */
export function assistantChatTitle(title: string, locale: Locale): string {
    const trimmed = title.trim();
    if (trimmed.length > 0) return trimmed;
    return assistantSidebarLabel('untitledChat', locale);
}
