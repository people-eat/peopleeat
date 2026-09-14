import type { Locale } from '../utils/locale';
import { assistantSidebarLabels } from './assistantSidebarCopy';

/** List/header title; empty server title → localized untitled label. */
export function assistantChatTitle(title: string, locale: Locale): string {
    const trimmed = title.trim();
    if (trimmed.length > 0) return trimmed;
    return assistantSidebarLabels.untitledChat[locale];
}
